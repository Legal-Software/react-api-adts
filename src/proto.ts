
import { Writer } from "protobufjs/minimal";
import {Decoder, Encoder} from "./api";

function serialize(writer: Writer): ArrayBuffer {
  const bin = writer.finish()
  return bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength)
}

interface ProtoEncoder<T> {
  encode(message: T): Writer
}

interface ProtoDecoder<T> {
  decode(input: Uint8Array): T
}

const protobufContentType = "application/protobuf"

export function protoEncoder<T>(enc: ProtoEncoder<T>): Encoder<T>{
  return new Encoder<T>(protobufContentType, (t: T) => serialize(enc.encode(t)))
}

export function protoDecoder<T>(dec: ProtoDecoder<T>): Decoder<T>{
  return new Decoder<T>(protobufContentType, (buf: ArrayBuffer) => dec.decode(new Uint8Array(buf)))
}
