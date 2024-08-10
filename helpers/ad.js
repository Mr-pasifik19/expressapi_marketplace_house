import Ad from "../models/ad.js";

export const incrementViewCount = async (adId) => {
  try {
    await Ad.findByIdAndUpdate(adId, {
      $inc: {
        views: 1,
      },
    });
  } catch (error) {
    console.error("Error incrementing view count:", error);
  }
};
