from functools import lru_cache
from typing import Any, Callable, Dict, Union

ComputeFn = Callable[[], Any]


class LRUCacheByHash:
    # We rely on functools.lru_cache to implement the caching here. However,
    # this wrapper around the `functools.lru_cache` interface assumes that the
    # client already maintains an efficiently computed hash of values, so we
    # don't need lru_cache to create its own key from the (potentially large)
    # input parameters. We workaround this by indirectly communicating the
    # value to the cached function via a dictionary keyed on the hash, so that
    # as far as the lru_cache function knows, its only parameter, and thus
    # the cache key, is the string.
    _compute_fn_by_hash: Dict[str, ComputeFn] = {}

    def __init__(self, cache_item_capacity):
        self._compute_fn_by_hash = {}

        @lru_cache(maxsize=cache_item_capacity)
        def make_value_cached(hash: str):
            compute_fn = self._compute_fn_by_hash[hash]
            return compute_fn()

        self._make_value_cached = make_value_cached

    def set_default(self, hash: str, compute: ComputeFn):
        self._compute_fn_by_hash[hash] = compute
        value = self._make_value_cached(hash)
        del self._compute_fn_by_hash[hash]
        return value

    def cache_info(self):
        return self._make_value_cached.cache_info()
