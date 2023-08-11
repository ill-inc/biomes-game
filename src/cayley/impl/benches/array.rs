#[macro_use]
extern crate bencher;

use bencher::Bencher;
use cayley::arrays::*;

fn bench_assign(bench: &mut Bencher) {
    let a = Array::fill([100, 100], 1);
    let mut b = Array::fill([100, 100], 0);

    bench.iter(|| {
        b.assign_all(a.all());
    });
}

fn bench_add_2_assign(bench: &mut Bencher) {
    let a = Array::fill([100, 100], 1);
    let b = Array::fill([100, 100], 2);
    let mut c = Array::fill([100, 100], 0);

    bench.iter(|| {
        c.assign_all(a.all().zip(b.all()).map(|(x, y)| x + y));
    });
}

fn bench_add_3_assign(bench: &mut Bencher) {
    let a = Array::fill([100, 100], 1);
    let b = Array::fill([100, 100], 2);
    let c = Array::fill([100, 100], 3);
    let mut d = Array::fill([100, 100], 0);

    bench.iter(|| {
        d.assign_all(
            a.all()
                .zip(b.all())
                .zip(c.all())
                .map(|((x, y), z)| x + y + z),
        );
    });
}

fn bench_view_assign(bench: &mut Bencher) {
    let a = Array::fill([100, 100], 1);
    let mut b = Array::fill([100, 100], 0);

    bench.iter(|| {
        b.assign([1..99, 1..99], a.view([1..99, 1..99]));
    });
}

fn bench_view_mul(bench: &mut Bencher) {
    let a = Array::fill([100, 100], 1);
    let b = Array::fill([100, 100], 2);
    let mut c = Array::fill([100, 100], 0);

    bench.iter(|| {
        let av = a.view([1..99, 1..99]).to_array();
        let bv = b.view([1..99, 1..99]).to_array();
        c.assign([1..99, 1..99], av.zip(bv).map(|(x, y)| x + y));
    });
}

fn bench_view_mul_lazy(bench: &mut Bencher) {
    let a = Array::fill([100, 100], 1);
    let b = Array::fill([100, 100], 2);
    let mut c = Array::fill([100, 100], 0);

    bench.iter(|| {
        let av = a.view([1..99, 1..99]);
        let bv = b.view([1..99, 1..99]);
        c.assign([1..99, 1..99], av.zip(bv).map(|(x, y)| x + y));
    });
}

benchmark_group!(
    benches,
    bench_assign,
    bench_add_2_assign,
    bench_add_3_assign,
    bench_view_assign,
    bench_view_mul,
    bench_view_mul_lazy,
);
benchmark_main!(benches);
