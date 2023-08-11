export class Buffer {
  private size = 0;
  private code: Uint8Array;

  constructor() {
    this.code = new Uint8Array(128);
  }

  private makeRoom(size: number) {
    if (this.size + size > this.code.length) {
      const old = this.code;
      this.code = new Uint8Array(old.length * 2);
      this.code.set(old);
    }
  }

  private writer() {
    return new DataView(
      this.code.buffer,
      this.code.byteOffset,
      this.code.byteLength
    );
  }

  get length() {
    return this.size;
  }

  pushBool(v: boolean) {
    this.makeRoom(1);
    this.writer().setUint8(this.size, v ? 1 : 0);
    this.size += 1;
  }

  pushI8(v: number) {
    this.makeRoom(1);
    this.writer().setInt8(this.size, v);
    this.size += 1;
  }

  pushI16(v: number) {
    this.makeRoom(2);
    this.writer().setInt16(this.size, v, true /* littleEndian */);
    this.size += 2;
  }

  pushI32(v: number) {
    this.makeRoom(4);
    this.writer().setInt32(this.size, v, true /* littleEndian */);
    this.size += 4;
  }

  pushI64(v: bigint) {
    this.makeRoom(8);
    this.writer().setBigInt64(this.size, v, true /* littleEndian */);
    this.size += 8;
  }

  pushU8(v: number) {
    this.makeRoom(1);
    this.writer().setUint8(this.size, v);
    this.size += 1;
  }

  pushU16(v: number) {
    this.makeRoom(2);
    this.writer().setUint16(this.size, v, true /* littleEndian */);
    this.size += 2;
  }

  pushU32(v: number) {
    this.makeRoom(4);
    this.writer().setUint32(this.size, v, true /* littleEndian */);
    this.size += 4;
  }

  pushU64(v: bigint) {
    this.makeRoom(8);
    this.writer().setBigUint64(this.size, v, true /* littleEndian */);
    this.size += 8;
  }

  pushF32(v: number) {
    this.makeRoom(4);
    this.writer().setFloat32(this.size, v, true /* littleEndian */);
    this.size += 4;
  }

  pushF64(v: number) {
    this.makeRoom(8);
    this.writer().setFloat64(this.size, v, true /* littleEndian */);
    this.size += 8;
  }

  pushBytes(bytes: Uint8Array) {
    this.makeRoom(bytes.length);
    this.code.set(bytes, this.size);
    this.size += bytes.length;
  }

  shrinkToFit() {
    if (this.size < this.code.length) {
      this.code = this.code.slice(0, this.size);
    }
  }

  writeTo(out: Uint8Array) {
    if (out.length != this.length) {
      throw new Error("Output array must match buffer length");
    } else {
      out.set(this.code.subarray(0, out.length));
    }
  }

  toBytes() {
    const ret = new Uint8Array(this.length);
    this.writeTo(ret);
    return ret;
  }
}
