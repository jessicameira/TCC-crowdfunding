// Isso tudo roda como script Lua dentro do Redis pq o Redis executa Lua em
// single-thread — ler o saldo, calcular o refill e decrementar o token viram uma
// coisa só, atômica. Sem isso, duas requisições ao mesmo tempo podiam ler o mesmo
// saldo e as duas passarem quando só uma deveria.
//
// KEYS[1] = chave do bucket no Redis
// ARGV[1] = capacity (máximo de tokens)
// ARGV[2] = refillRate (tokens adicionados por segundo)
// ARGV[3] = timestamp atual em milissegundos
//
// Retorna { allowed (0|1), tokensRestantes (string) }
export const TOKEN_BUCKET_SCRIPT = `
local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refillRate = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

local bucket = redis.call('HMGET', key, 'tokens', 'timestamp')
local tokens = tonumber(bucket[1])
local timestamp = tonumber(bucket[2])

if tokens == nil then
  tokens = capacity
  timestamp = now
end

local elapsed = math.max(0, now - timestamp)
local refilled = (elapsed / 1000) * refillRate
tokens = math.min(capacity, tokens + refilled)

local allowed = 0
if tokens >= 1 then
  tokens = tokens - 1
  allowed = 1
end

redis.call('HMSET', key, 'tokens', tostring(tokens), 'timestamp', tostring(now))
redis.call('EXPIRE', key, 3600)

return { allowed, tostring(tokens) }
`;
