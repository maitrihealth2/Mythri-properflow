import asyncio

async def my_async_func():
    return "Hello"

async def main():
    res = await asyncio.to_thread(my_async_func)
    print("Result:", res)
    print("Type:", type(res))

asyncio.run(main())
