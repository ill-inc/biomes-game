export class AcceptableAsPathKey {}

type Arg = string | number | AcceptableAsPathKey;
export type PathDef<A extends Arg[], R> = { args: A; ret: R };
export type PathMap<P> = { [K in keyof P]: PathDef<Arg[], any> };
