import { chunkPromise } from "../src/chunkPromise";

describe("chunking promises", () => {
  it("should chunk promises", async () => {
    const mockedPromiseFns = [
      jest.fn().mockResolvedValue(1).mockName("1"),
      jest.fn().mockResolvedValue(2).mockName("2"),
      jest.fn().mockResolvedValue(3).mockName("3"),
      jest.fn().mockResolvedValue(4).mockName("4"),
      jest.fn().mockResolvedValue(5).mockName("5"),
    ];

    await chunkPromise(mockedPromiseFns, 2);

    for (const mockedPromiseFn of mockedPromiseFns) {
      expect(mockedPromiseFn).toBeCalledTimes(1);
    }
  });

  it("should throw, if one promise was rejected", async () => {
    const mockedPromiseFns = [
      jest.fn().mockResolvedValue(1).mockName("1"),
      jest.fn().mockResolvedValue(2).mockName("2"),
      jest.fn().mockResolvedValue(3).mockName("3"),
      jest.fn().mockResolvedValue(4).mockName("4"),
      jest.fn().mockResolvedValue(5).mockName("5"),
    ];

    expect(async () => await chunkPromise(mockedPromiseFns, 2)).rejects;
  });
});
