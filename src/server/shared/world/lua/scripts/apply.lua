-- WARNING WARNING WARNING WARNING
-- This script is the core implementation for applying transactions
-- to the world state. Be VERY careful when modifying it!
--
-- Also see: scripts/node/test_redis.ts for a test suite to run against
-- it when modified, and see https://www.notion.so/illinc/Running-Redis-Locally-71ab3e4d93844c768b3d5fd2f112e947
-- for how to run with Redis locally.
--

-- Entities are a 3-tuple of state:
--   { version, version-by-component-id, data, last-change }
--   Data is a table keyed by component-ID with values of
--   v8 encoded component data.

-- Changes are one of:
--   { 0, id } for delete
--   { 1, id, data } for update
--   { 2, id, data } for create
-- Data may include the value 0 for a component that is deleted.

local function redisKey(id)
    return string.format("b:%.f", id)
end

-- Check if the entity state passes the condition
-- 'iffs' are either:
--   { entity-id, version }
--   { entity-id, version, component-id, ... }
local function checkIff(iff, state)
    if #iff == 1 then
        return state ~= nil and state[3] ~= 0
    end
    local expected = tonumber(iff[2])
    if state == nil then
        return expected == 0
    end
    if state[1] <= expected then
        -- The state is in the past, quick exit
        return true
    end
    if state[3] == 0 and expected == 0 then
        -- Empty entity, permit it
        return true
    end
    if #iff == 2 then
        -- No component-wise check, fail.
        return false
    end
    for i = 3, #iff do
        local componentVersion = state[2][string.format("%.f", iff[i])]
        if componentVersion ~= nil and componentVersion > expected then
            return false
        end
    end
    return true
end

-- Check if a change is acceptable to apply to the given entities
local function canApply(stateById, changeToApply, eagerStateIds)
    if changeToApply.iffs == nil then
        return true
    end
    local ok = true
    for _, iff in ipairs(changeToApply.iffs) do
        local id = redisKey(iff[1])
        local state = stateById[id]
        if not checkIff(iff, state) then
            ok = false
            eagerStateIds[id] = true
            break
        end
    end
    return ok
end

-- Apply a change to an entity state to generate a new one
local function applyChange(oldState, newTick, change)
    local newState = { newTick, nil, 0 }
    if oldState == nil then
        newState[2] = {}
    else
        newState[2] = oldState[2]
    end
    if change[1] == 0 then
        -- Delete change
        if oldState ~= nil and oldState[3] ~= 0 then
            -- Mark this as the tick all the components went away.
            for componentId, _ in pairs(oldState[3]) do
                newState[2][componentId] = newTick
            end
        end
    elseif change[1] == 1 then
        --- Update change
        if oldState ~= nil and oldState[3] ~= 0 then
            newState[3] = oldState[3]
        else
            newState[3] = {}
        end
        for componentId, componentData in pairs(change[3]) do
            newState[2][componentId] = newTick
            if componentData ~= 0 then
                newState[3][componentId] = componentData
            else
                newState[3][componentId] = nil
            end
        end
    elseif change[1] == 2 then
        -- Create change
        newState[3] = {}
        if oldState ~= nil and oldState[3] ~= 0 then
            for componentId, _ in pairs(oldState[3]) do
                newState[2][componentId] = newTick
            end
        end
        for componentId, componentData in pairs(change[3]) do
            if componentData ~= 0 then
                newState[2][componentId] = newTick
                newState[3][componentId] = componentData
            end
        end
    end
    return newState
end

-- Apply a set of proposed changes to the entities
-- This both modifies the entities that have been decoded, as well
-- as writes to the appropriate data directly.
local function applyChanges(stateById, newTick, dirtyStates, proposedChanges)
    for _, change in ipairs(proposedChanges) do
        local id = redisKey(change[2])
        local oldState = stateById[id]
        local newState = applyChange(oldState, newTick, change)
        stateById[id] = newState
        dirtyStates[id] = newState
    end
end

-- Decode the request
local request = cmsgpack.unpack(ARGV[1])
local states = redis.call('MGET', unpack(KEYS))

local tick = 0
local stateById = {}
local dirtyStates = {}

-- Determine all available entity data by ID
for idx, raw in ipairs(states) do
    if idx == 1 then
        -- First key is the prior tick.
        if raw ~= false then
            ---@diagnostic disable-next-line: param-type-mismatch
            tick = math.floor(tonumber(raw))
        end
    elseif raw ~= false then
        local state = cmsgpack.unpack(raw)
        stateById[KEYS[idx]] = state
    end
end

local newTick = tick + 1
local outcomes = {}
local eagerStateIds = {}
local allChangesInTick = {}
local allEventsInTick = {}
local allLeaderboardsInTick = {}
for _, changeToApply in ipairs(request.cta) do
    if not canApply(stateById, changeToApply, eagerStateIds) then
        table.insert(outcomes, "aborted")
    else
        if changeToApply.changes then
            applyChanges(stateById, newTick, dirtyStates, changeToApply.changes)
            for _, change in ipairs(changeToApply.changes) do
                table.insert(allChangesInTick, change)
            end
        end
        if changeToApply.events then
            for _, event in ipairs(changeToApply.events) do
                table.insert(allEventsInTick, event)
            end
        end
        if changeToApply.leaderboards then
            for _, leaderboard in ipairs(changeToApply.leaderboards) do
                table.insert(allLeaderboardsInTick, leaderboard)
            end
        end
        if changeToApply.catchups then
            for _, catchup in ipairs(changeToApply.catchups) do
                eagerStateIds[redisKey(catchup[1])] = true
            end
        end
        table.insert(outcomes, "success")
    end
end

if #allChangesInTick > 0 then
    local dirty = {}
    for id, state in pairs(dirtyStates) do
        if state[3] == 0 then
            -- Have tombstones expire after a day.
            redis.call('SET', id, cmsgpack.pack(state), 'ex', 86400)
        else
            table.insert(dirty, id)
            table.insert(dirty, cmsgpack.pack(state))
        end
    end
    if #dirty > 0 then
        redis.call('MSET', unpack(dirty))
    end
end

if #allChangesInTick > 0 or #allEventsInTick > 0 then
    redis.call('SET', KEYS[1], newTick)
    if #allChangesInTick > 0 then
        redis.call('XADD', 'ecs',
            '*', 'ecs', cmsgpack.pack({ newTick, allChangesInTick }))
    end
    if #allEventsInTick > 0 then
        redis.call('XADD', 'firehose',
            'MINID', '~', request.now - 24 * 3600 * 1000, -- 24 hours ago
            '*', 'd', cmsgpack.pack(allEventsInTick))
    end
end

if #allLeaderboardsInTick > 0 then
    for _, leaderboard in ipairs(allLeaderboardsInTick) do
        redis.call('ZADD', leaderboard[1], leaderboard[3], leaderboard[2], redisKey(leaderboard[4]))
    end
end

local eagerStates = {}
for id, _ in pairs(eagerStateIds) do
    table.insert(eagerStates, { id, stateById[id] })
end

return cmsgpack.pack({
    outcomes = outcomes,
    eagerStates = eagerStates,
})
