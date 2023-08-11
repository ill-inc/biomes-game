POPCOUNT_TABLE_16 = [0] * 2 ** 16

for index in range(len(POPCOUNT_TABLE_16)):
    POPCOUNT_TABLE_16[index] = (index & 1) + POPCOUNT_TABLE_16[index >> 1]


def popcount_32(x):
    return POPCOUNT_TABLE_16[x & 0xFFFF] + POPCOUNT_TABLE_16[(x >> 16) & 0xFFFF]
