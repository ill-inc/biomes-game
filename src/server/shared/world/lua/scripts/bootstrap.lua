-- Scan Redis, fetching the results that pass the supplied filters
-- include: filter.lua

local cursor = ARGV[1];
local request = cmsgpack.unpack(ARGV[2]);

local result = redis.call("SCAN", cursor, "MATCH", "b:*", "COUNT", request.count);

local output = { result[1], {} }

local keys = result[2];
if #keys > 0 then
  local states = redis.call('MGET', unpack(keys));

  if emptyFilter(request.filter) then
    -- They don't filter results at all, pass it right along
    for idx, state in ipairs(states) do
      table.insert(output[2], { keys[idx], state })
    end
  else
    for idx, state in ipairs(states) do
      if passes(cmsgpack.unpack(state), request.filter) then
        table.insert(output[2], { keys[idx], state })
      end
    end
  end
end
return output
