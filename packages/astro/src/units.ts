declare const brand: unique symbol;

/**
 * A number tagged with a unit or meaning at compile time only. At runtime it is
 * a plain number, so it costs nothing in hot loops; in the type checker a `Deg`
 * cannot be passed where a `Rad` is expected (spec CORE-01).
 */
export type Brand<B extends string> = number & { readonly [brand]: B };

export type Deg = Brand<'deg'>;
export type Rad = Brand<'rad'>;
export type RadPerS = Brand<'rad/s'>;
export type Km = Brand<'km'>;
export type KmPerS = Brand<'km/s'>;
export type Minutes = Brand<'min'>;
export type Seconds = Brand<'s'>;
export type Hz = Brand<'Hz'>;

export const deg = (value: number): Deg => value as Deg;
export const rad = (value: number): Rad => value as Rad;
export const radPerS = (value: number): RadPerS => value as RadPerS;
export const km = (value: number): Km => value as Km;
export const kmPerS = (value: number): KmPerS => value as KmPerS;
export const minutes = (value: number): Minutes => value as Minutes;
export const seconds = (value: number): Seconds => value as Seconds;
export const hz = (value: number): Hz => value as Hz;

const RAD_PER_DEG = Math.PI / 180;

export const degToRad = (angle: Deg): Rad => rad(angle * RAD_PER_DEG);
export const radToDeg = (angle: Rad): Deg => deg(angle / RAD_PER_DEG);
