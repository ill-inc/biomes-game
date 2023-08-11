// Helper class to match server time to the current animation time.
// Importantly, for events that it's never seen before whose timestamps are
// close to the current time, it will snap them to the current time so that
// their animation plays from the beginning without any missing frames.
export class TimelineMatcher {
  private readonly tickMap: Map<
    string,
    { worldTime: number; animationTime: number }
  > = new Map();

  constructor(private readonly getAnimationNow: () => number) {}

  // Checks if an animation time mapping already exists for the specified
  // worldTime and if so returns that, otherwise, creates a mapping and returns
  // that.
  match(label: string, worldTime: number, worldNow: number): number {
    let mapping = this.tickMap.get(label);
    if (!mapping || mapping.worldTime < worldTime) {
      const secondsSinceEvent = worldNow - worldTime;
      // If the time difference is small (less than a second), snap the start
      // time to the current animation time so animations start at the
      // beginning.
      const ANIMATION_START_GRACE_PERIOD = 2;
      const animationNow = this.getAnimationNow();
      const animationTime =
        secondsSinceEvent > ANIMATION_START_GRACE_PERIOD
          ? animationNow - secondsSinceEvent + ANIMATION_START_GRACE_PERIOD
          : animationNow;
      mapping = { worldTime, animationTime };
      this.tickMap.set(label, mapping);
    }

    return mapping.animationTime;
  }

  // Returns the animation time of the specified label, or undefined if it
  // isn't set.
  query(label: string): number | undefined {
    return this.tickMap.get(label)?.animationTime;
  }

  animationNow() {
    return this.getAnimationNow();
  }
}
