ret = [0] * 256
for i in range(256):
    ret[i] = ret[i >> 1] + (i & 1)
print(",\n".join(str(x) for x in ret))
