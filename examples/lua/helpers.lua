
function to_string(data, indent)
   local str = ""

   if(indent == nil) then
       indent = 0
   end

   -- Check the type
   if(type(data) == "string") then
       str = str .. (" "):rep(indent) .. data .. "\n"
   elseif(type(data) == "number") then
       str = str .. (" "):rep(indent) .. data .. "\n"
   elseif(type(data) == "boolean") then
       if(data == true) then
           str = str .. "true"
       else
           str = str .. "false"
       end
   elseif(type(data) == "table") then
       local i, v
       for i, v in pairs(data) do
           -- Check for a table in a table
           if(type(v) == "table") then
               str = str .. (" "):rep(indent) .. i .. ":\n"
               str = str .. to_string(v, indent + 2)
           else
               str = str .. (" "):rep(indent) .. i .. ": " .. to_string(v, 0)
           end
       end
   else
       -- print(1, "Error: unknown data type: %s", type(data))
   end

   return str
end

function analyze(identifier, val)
    print(identifier .. ' value : ' .. to_string(val) .. ' and type : ' .. type(val))
end

function put(t, tKey, oKey, oVal)
    if not t[tKey] then
        t[tKey] = {}
        t[tKey][oKey] = oVal
    else
        t[tKey][oKey] = oVal
    end
end

function exists(key)
    return (redis.call('exists', key) == 1)
end

logging_enabled = true
function log(str)
    if (logging_enabled) then
        print(str)
    end
end