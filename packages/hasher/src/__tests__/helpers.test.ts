import { hashStrings } from "../helpers";

describe("hashStrings()", () => {
  it("creates different hashes given different lists", () => {
    const list: string[] = [];

    list.push("foo");
    list.push("bar");

    const hash = hashStrings(list);

    list.push("baz");
    const hashWithBaz = hashStrings(list);

    expect(hash).not.toEqual(hashWithBaz);

    list.pop();
    const hashWithoutBaz = hashStrings(list);

    expect(hash).toEqual(hashWithoutBaz);
  });

  it("lists of different order produce the same hash", () => {
    const list: string[] = [];

    list.push("foo");
    list.push("bar");

    const hash = hashStrings(list);

    list.reverse();
    const hashReverse = hashStrings(list);

    expect(hash).toEqual(hashReverse);
  });
});
