-- Like MGET, but apply a given filter
-- include: filter.lua

local states = redis.call("MGET", unpack(KEYS))
local filter = cmsgpack.unpack(ARGV[1])

if emptyFilter(filter) then
  -- They don't filter results at all, pass it right along
  return states
end

local result = {}
for _, state in ipairs(states) do
  if passes(cmsgpack.unpack(state), filter) then
    table.insert(result, state)
  else
    table.insert(result, 0)
  end
end
return result
