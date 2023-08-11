from typing import Generic, Protocol, TypeVar, Union, cast

from voxeloo import tensors as cpp


class DataType(Protocol):
    py = Union[bool, int, float]


class Bool:
    py = bool


class I8:
    py = int


class I16:
    py = int


class I32:
    py = int


class I64:
    py = int


class U8:
    py = int


class U16:
    py = int


class U32:
    py = int


class U64:
    py = int


class F32:
    py = int


class F64:
    py = int


CTORS = {
    Bool: cpp.Tensor_Bool,
    I8: cpp.Tensor_I8,
    I16: cpp.Tensor_I16,
    I32: cpp.Tensor_I32,
    I64: cpp.Tensor_I64,
    U8: cpp.Tensor_U8,
    U16: cpp.Tensor_U16,
    U32: cpp.Tensor_U32,
    U64: cpp.Tensor_U64,
    F32: cpp.Tensor_F32,
    F64: cpp.Tensor_F64,
}

T = TypeVar("T", bound=DataType)


class Tensor(Generic[T]):
    pass


def zeros(dtype: T) -> Tensor[T]:
    return CTORS[dtype](shape=(32, 32, 32), fill=0)
