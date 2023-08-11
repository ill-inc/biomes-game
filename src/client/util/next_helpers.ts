export function sanitizeServerSideProps<P>(props: P): P {
  // Workaround for dumb next issue where it throws if you have an undefined
  // see https://github.com/vercel/next.js/discussions/11209
  if (process.env.NODE_ENV !== "production") {
    return JSON.parse(JSON.stringify(props));
  }
  return props;
}
