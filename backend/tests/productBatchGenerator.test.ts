import { describe, expect, it } from "vitest";
import { generateProductBatch } from "../src/services/productBatchGenerator.js";

const store = {
  audience: "Local gym members and online training clients",
  brandStyle: "Bold monochrome streetwear with electric accent colors",
  businessName: "Northline Gym",
  clientName: "Northline Fitness",
  id: "clx0b5v8g000008l58v3n0wz0",
  industry: "Fitness",
  productTypes: ["T-shirts", "Hoodies"]
};

describe("product batch generator", () => {
  it("generates complete POD product drafts for the requested batch size", () => {
    const products = generateProductBatch(store, {
      audience: store.audience,
      priceRange: {
        max: 52,
        min: 26
      },
      productCount: 10,
      productTypes: store.productTypes,
      riskTolerance: "Medium",
      storeId: store.id,
      styleDirection: store.brandStyle
    });

    expect(products).toHaveLength(10);
    expect(products[0]).toMatchObject({
      aiDisclosureNeeded: true,
      productionPartnerDisclosureNeeded: true,
      status: "Awaiting Approval",
      storeId: store.id
    });
    expect(products[0].designPrompt).toContain("Northline Gym");
    expect(products[0].tags.length).toBeGreaterThan(3);
  });

  it("keeps pricing estimates inside the requested range", () => {
    const products = generateProductBatch(store, {
      audience: store.audience,
      priceRange: {
        max: 44,
        min: 32
      },
      productCount: 5,
      productTypes: ["Mugs"],
      riskTolerance: "Low",
      storeId: store.id,
      styleDirection: store.brandStyle
    });

    expect(products.every((product) => product.retailPrice >= 32 && product.retailPrice <= 44)).toBe(true);
    expect(products.every((product) => product.complianceNotes?.includes("Run trademark search"))).toBe(true);
  });
});
