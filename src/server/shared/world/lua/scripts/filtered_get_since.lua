-- Like MGET, but apply a given filter
-- include: filter.lua

local rawStates = redis.call("MGET", unpack(KEYS))
local filter = cmsgpack.unpack(ARGV[#KEYS + 1])

local result = {}
for i, rawState in ipairs(rawStates) do
  local key = KEYS[i]
  if rawState == false then
    table.insert(result, cmsgpack.pack({ 0, key, tonumber(ARGV[i]) + 1 }))
  else
    local state = cmsgpack.unpack(rawState)
    if state[3] == 0 or not passes(state, filter) then
      table.insert(result, cmsgpack.pack({ 0, key, state[1] }))
    else
      local neededVersion = tonumber(ARGV[i])
      if filterChangedSince(state, filter, neededVersion) then
        table.insert(result, cmsgpack.pack({ 2, key, state[1], state[3] }))
      else
        local delta = {}
        local hadAnyChanges = false
        for componentId, componentVersion in pairs(state[2]) do
          if componentVersion >= neededVersion then
            hadAnyChanges = true
            if state[3][componentId] ~= nil then
              delta[componentId] = state[3][componentId]
            else
              delta[componentId] = 0
            end
          end
        end
        if hadAnyChanges then
          table.insert(result, cmsgpack.pack({ 1, key, state[1], delta }))
        end
      end
    end
  end
end
return result
