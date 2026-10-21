function isIPv4(hostname: string): boolean {
  const parts = hostname.split('.')
  return parts.length === 4 && parts.every((part) => {
    if (!/^\d{1,3}$/u.test(part)) return false
    const value = Number(part)
    return value >= 0 && value <= 255
  })
}

function isPrivateIPv4(hostname: string): boolean {
  if (!isIPv4(hostname)) return false
  const [first, second] = hostname.split('.').map(Number)
  return first === 10 || (first === 172 && second !== undefined && second >= 16 && second <= 31)
    || (first === 192 && second === 168)
}

function isLoopback(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '[::1]'
    || (isIPv4(hostname) && hostname.startsWith('127.'))
}

export function normalizeGatewayBaseURL(
  value: string,
  options: { allowRemoteHttps?: boolean } = {},
): string {
  const input = value.trim()
  if (input.length === 0 || input.length > 2048) throw new Error('Enter a valid ZeroClave Gateway URL')

  let url: URL
  try { url = new URL(input) } catch {
    throw new Error('Enter a valid ZeroClave Gateway URL')
  }

  if (url.username !== '' || url.password !== '' || url.search !== '' || url.hash !== '') {
    throw new Error('Gateway URL must not contain credentials, query parameters, or a fragment')
  }

  const localHttp = url.protocol === 'http:' && (isLoopback(url.hostname) || isPrivateIPv4(url.hostname))
  if (url.protocol !== 'https:' && !localHttp) {
    throw new Error('Use HTTPS, or HTTP for a loopback or private IPv4 Gateway')
  }
  const localGateway = isLoopback(url.hostname) || isPrivateIPv4(url.hostname)
  if (options.allowRemoteHttps === false && !localGateway) {
    throw new Error('Custom Gateway overrides must target a loopback or private IPv4 address')
  }
  if (options.allowRemoteHttps === false
    && !['', '/', '/v1', '/v1/pii/detect'].includes(url.pathname.replace(/\/+$/u, ''))) {
    throw new Error('Use a Gateway base URL, optionally ending in /v1 or /v1/pii/detect')
  }

  return url.toString().replace(/\/+$/u, '')
}
