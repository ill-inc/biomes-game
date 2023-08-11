-- Not intended for independent usage, but common helper for checking if something
-- passes a filter.

local function emptyFilter(filter)
  if filter == nil or filter == 0 then
    return true
  end
  if filter[1] ~= 0 then
    return false
  end
  if filter[2] ~= 0 and #filter[2] > 0 then
    return false
  end
  return true
end

local function passes(state, filter)
  if state == nil or state[3] == 0 then
    return true
  end
  if filter == nil or filter == 0 then
    return true
  end
  if filter[1] ~= 0 then
    local passedAnyOf = false;
    for _, componentId in ipairs(filter[1]) do
      local componentData = state[3][componentId]
      if componentData ~= nil and componentData ~= 0 then
        passedAnyOf = true
        break
      end
    end
    if not passedAnyOf then
      return false
    end
  end
  if filter[2] ~= 0 then
    for _, componentId in ipairs(filter[2]) do
      local componentData = state[3][componentId]
      if componentData ~= nil and componentData ~= 0 then
        return false
      end
    end
  end
  return true
end

local function filterChangedSince(state, filter, version)
  if filter == nil or filter == 0 then
    return false
  end
  if filter[1] ~= 0 then
    local passedAnyOf = false;
    for _, componentId in ipairs(filter[1]) do
      local componentVersion = state[2][componentId]
      if componentVersion ~= nil and componentVersion >= version then
        return true
      end
    end
  end
  if filter[2] ~= 0 then
    for _, componentId in ipairs(filter[2]) do
      local componentVersion = state[2][componentId]
      if componentVersion ~= nil and componentVersion >= version then
        return true
      end
    end
  end
  return false
end
