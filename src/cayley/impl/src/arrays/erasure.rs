use std::any::TypeId;

use super::Array;

trait ArrayShape {
    fn shape(&self) -> &[usize];
}

impl<T, const D: usize> ArrayShape for Array<T, D> {
    fn shape(&self) -> &[usize] {
        &self.shape
    }
}

trait ArrayData<T> {
    fn data(&self) -> &[T];
}

impl<T, const D: usize> ArrayData<T> for Array<T, D> {
    fn data(&self) -> &[T] {
        &self.data[..]
    }
}

trait TypedArrayErasure<T>: ArrayShape + ArrayData<T> {
    fn type_id(&self) -> TypeId;
    fn erase(self: Box<Self>) -> AnyArray;
}

impl<T: 'static, const D: usize> TypedArrayErasure<T> for Array<T, D> {
    fn type_id(&self) -> TypeId {
        TypeId::of::<Array<T, D>>()
    }

    fn erase(self: Box<Self>) -> AnyArray {
        AnyArray::new(*self)
    }
}

pub struct TypedArray<T> {
    array: Box<dyn TypedArrayErasure<T>>,
}

impl<T: 'static> TypedArray<T> {
    pub fn new<const D: usize>(array: Array<T, D>) -> TypedArray<T> {
        TypedArray {
            array: Box::from(array),
        }
    }

    pub fn shape(&self) -> &[usize] {
        self.array.shape()
    }

    pub fn data(&self) -> &[T] {
        self.array.data()
    }

    pub unsafe fn bytes(&self) -> &[u8] {
        std::slice::from_raw_parts(
            self.data().as_ptr() as *const u8,
            self.data().len() * std::mem::size_of::<T>(),
        )
    }

    pub fn dim(&self) -> usize {
        self.array.shape().len()
    }

    pub fn is<const D: usize>(&self) -> bool {
        self.dim() == D
    }

    pub fn array<const D: usize>(self) -> Option<Array<T, D>> {
        if self.is::<D>() {
            unsafe { Some(*unchecked_box_cast::<Array<T, D>, _>(self.array)) }
        } else {
            None
        }
    }

    pub fn array_ref<const D: usize>(&self) -> Option<&Array<T, D>> {
        if self.is::<D>() {
            unsafe { Some(unchecked_ref_cast::<Array<T, D>, _>(&*self.array)) }
        } else {
            None
        }
    }

    pub fn array_mut<const D: usize>(&mut self) -> Option<&mut Array<T, D>> {
        if self.is::<D>() {
            unsafe { Some(unchecked_mut_cast::<Array<T, D>, _>(&mut *self.array)) }
        } else {
            None
        }
    }

    pub fn erase(self) -> AnyArray {
        self.array.erase()
    }
}

impl<T: 'static> ArrayShape for TypedArray<T> {
    fn shape(&self) -> &[usize] {
        self.shape()
    }
}

impl<T: 'static> ArrayData<T> for TypedArray<T> {
    fn data(&self) -> &[T] {
        self.data()
    }
}

trait AnyArrayErasure: ArrayShape {
    fn type_id(&self) -> TypeId;
}

impl<T: 'static> AnyArrayErasure for TypedArray<T> {
    fn type_id(&self) -> TypeId {
        TypeId::of::<TypedArray<T>>()
    }
}

pub struct AnyArray {
    array: Box<dyn AnyArrayErasure>,
}

impl AnyArray {
    pub fn new<T: 'static, const D: usize>(array: Array<T, D>) -> AnyArray {
        AnyArray::from_typed(TypedArray::new(array))
    }

    pub fn from_typed<T: 'static>(array: TypedArray<T>) -> AnyArray {
        AnyArray {
            array: Box::from(array),
        }
    }

    pub fn shape(&self) -> &[usize] {
        self.array.shape()
    }

    pub fn is<T: 'static>(&self) -> bool {
        self.array.type_id() == TypeId::of::<TypedArray<T>>()
    }

    pub fn typed<T: 'static>(self) -> Option<TypedArray<T>> {
        if self.is::<T>() {
            unsafe { Some(*unchecked_box_cast::<TypedArray<T>, _>(self.array)) }
        } else {
            None
        }
    }

    pub fn typed_ref<T: 'static>(&self) -> Option<&TypedArray<T>> {
        if self.is::<T>() {
            unsafe { Some(unchecked_ref_cast::<TypedArray<T>, _>(&*self.array)) }
        } else {
            None
        }
    }

    pub fn typed_mut<T: 'static>(&mut self) -> Option<&mut TypedArray<T>> {
        if self.is::<T>() {
            unsafe { Some(unchecked_mut_cast::<TypedArray<T>, _>(&mut *self.array)) }
        } else {
            None
        }
    }

    pub fn array<T: 'static, const D: usize>(self) -> Option<Array<T, D>> {
        self.typed::<T>()?.array::<D>()
    }

    pub fn array_ref<T: 'static, const D: usize>(&self) -> Option<&Array<T, D>> {
        self.typed_ref::<T>()?.array_ref::<D>()
    }

    pub fn array_mut<T: 'static, const D: usize>(&mut self) -> Option<&mut Array<T, D>> {
        self.typed_mut::<T>()?.array_mut::<D>()
    }
}

unsafe fn unchecked_box_cast<D, S: ?Sized>(src: Box<S>) -> Box<D> {
    Box::from_raw(Box::into_raw(src) as *mut D)
}

unsafe fn unchecked_ref_cast<D, S: ?Sized>(src: &S) -> &D {
    &*(src as *const S as *const D)
}

unsafe fn unchecked_mut_cast<D, S: ?Sized>(src: &mut S) -> &mut D {
    &mut *(src as *mut S as *mut D)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_typed_array() {
        // Move array into dim-erased type.
        let x = TypedArray::new(Array::fill([4], 1));
        assert_eq!(x.shape(), [4]);
        assert_eq!(x.data(), [1, 1, 1, 1]);

        // Try referencing underlying type.
        assert_eq!(x.array_ref::<1>().unwrap().to_string(), "[1, 1, 1, 1]");

        // Try moving out underlying type.
        assert_eq!(x.array::<1>().unwrap().to_string(), "[1, 1, 1, 1]");
    }

    #[test]
    fn test_any_array() {
        // Move array into dim-erased type.
        let x = AnyArray::new(Array::fill([4], 1));
        assert_eq!(x.shape(), [4]);

        // Try referencing underlying type.
        assert_eq!(x.array_ref::<i32, 1>().unwrap().to_string(), "[1, 1, 1, 1]");

        // Try moving out underlying type.
        assert_eq!(x.array::<i32, 1>().unwrap().to_string(), "[1, 1, 1, 1]");
    }

    #[test]
    fn test_double_erase() {
        let x = TypedArray::new(Array::fill([4], 1)).erase();

        // Try referencing underlying type.
        assert_eq!(x.array_ref::<i32, 1>().unwrap().to_string(), "[1, 1, 1, 1]");

        // Try moving out underlying type.
        assert_eq!(x.array::<i32, 1>().unwrap().to_string(), "[1, 1, 1, 1]");
    }
}
