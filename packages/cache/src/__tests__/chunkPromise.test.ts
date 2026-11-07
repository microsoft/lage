import { describe, expect, it, jest } from "@jest/globals";
import { chunkPromise } from "../chunkPromise.js";

describe("chunking promises", () => {
  it("should chunk promises", async () => {
    const mockedPromiseFns = [
      jest.fn(() => Promise.resolve(1)).mockName("1"),
      jest.fn(() => Promise.resolve(2)).mockName("2"),
      jest.fn(() => Promise.resolve(3)).mockName("3"),
      jest.fn(() => Promise.resolve(4)).mockName("4"),
      jest.fn(() => Promise.resolve(5)).mockName("5"),
    ];

    await chunkPromise(mockedPromiseFns, 2);

    for (const mockedPromiseFn of mockedPromiseFns) {
      expect(mockedPromiseFn).toHaveBeenCalledTimes(1);
    }
  });

  it("should throw, if one promise was rejected", async () => {
    const mockedPromiseFns = [
      jest.fn(() => Promise.resolve(1)).mockName("1"),
      jest.fn(() => Promise.reject(new Error("rejected"))).mockName("2"),
      jest.fn(() => Promise.resolve(3)).mockName("3"),
      jest.fn(() => Promise.resolve(4)).mockName("4"),
      jest.fn(() => Promise.resolve(5)).mockName("5"),
    ];

    await expect(async () => await chunkPromise(mockedPromiseFns, 2)).rejects.toThrow("rejected");
  });
});
