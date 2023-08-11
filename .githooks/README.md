Files in this folder are managed by the node package
[node-git-hooks](https://www.npmjs.com/package/node-git-hooks).

What this package does for us is copy the hooks in this folder over into the
`.git/hooks/` directory every time the user types `yarn install`. The
`.git/hooks` folder cannot be itself checked into the repository and verison
controlled, and `node-git-hooks` lets us work around this limitation.

Note that this README file is also copied over into the `.git/hooks` directory,
but it does no harm there.

### Personalizing the hooks

Some of the scripts (currently only pre-push) have a shim at the end which
checks for the existence of user defined hooks in the `.githooks.user/`
directory, and if they exist it will call them. The `.githooks.user/` directory
is added to `.gitignore`, so you can personalize these files.

For example, if you add:

```bash
#!/bin/bash
set -euxo pipefail

./b typecheck
./b lint ts
```

to the file `.githooks.user/pre-push`, then `./b typecheck` and `./b lint ts`
will run before each push.
