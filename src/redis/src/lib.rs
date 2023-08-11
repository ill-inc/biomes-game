use redis_module::{redis_module, Context, RedisError, RedisResult, RedisString};

fn hello(_: &Context, args: Vec<RedisString>) -> RedisResult {
    if args.len() < 2 {
        return Err(RedisError::WrongArity);
    }

    let nums = args
        .into_iter()
        .skip(1)
        .map(|s| s.parse_integer())
        .collect::<Result<Vec<i64>, RedisError>>()?;

    if let Err(e) = nums.iter().try_for_each(|n| {
        if *n < 0 {
            Err(RedisError::String(format!(
                "Negative number not allowed: {}",
                n
            )))
        } else {
            Ok(())
        }
    }) {
        return Err(e);
    }

    let product = nums.iter().product();

    let mut response = nums;
    response.push(product);

    Ok(response.into())
}

//////////////////////////////////////////////////////

redis_module! {
    name: "biomes",
    version: 1,
    allocator: (redis_module::alloc::RedisAlloc, redis_module::alloc::RedisAlloc),
    data_types: [],
    commands: [
        ["biomes.hello", hello, "", 0, 0, 0],
    ],
}
