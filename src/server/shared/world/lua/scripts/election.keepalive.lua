local key = KEYS[1]
local nonce = ARGV[1]
local value = ARGV[2]
local ttl = tonumber(ARGV[3])

if ttl <= 0 then
    if redis.call("HEXISTS", key, nonce) then
        -- We were leader
        redis.call("DEL", key)
        redis.call("PUBLISH", key, "changed")
    end
    return "NOT_LEADER"
else
    if redis.call("HLEN", key) > 0 then
        -- There is a leader
        if not redis.call("HEXISTS", key, nonce) then
            -- The leader is not us.
            return "NOT_LEADER"
        end
        -- We were leader, extend our TTL, and rewrite value
    end
    redis.call("HSET", key, nonce, value)
    redis.call("EXPIRE", key, ttl)
    return "OK"
end
