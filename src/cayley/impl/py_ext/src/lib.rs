use cayley;
use cayley::arrays;
use cayley::arrays::ArrayIterable;
use pyo3::prelude::*;

#[pyclass]
#[derive(Debug, Clone)]
struct ArrayU32 {
    base: arrays::Array<u32, 1>,
}

#[pymethods]
impl ArrayU32 {
    #[new]
    fn new(size: usize, fill: u32) -> ArrayU32 {
        ArrayU32 {
            base: arrays::Array::fill([size], fill),
        }
    }

    #[pyo3(name = "__iadd__")]
    fn add_assign(&mut self, other: &ArrayU32) {
        self.base.assign_all(
            self.base
                .all()
                .zip(other.base.all())
                .map(|(x, y)| x + y)
                .to_array(),
        );
    }

    #[pyo3(name = "__str__")]
    fn fmt(&self) -> String {
        format!("{}", self.base)
    }
}

#[pymodule]
#[pyo3(name = "cayley")]
fn cayley_mod(_py: Python, m: &PyModule) -> PyResult<()> {
    m.add_class::<ArrayU32>()?;
    Ok(())
}
