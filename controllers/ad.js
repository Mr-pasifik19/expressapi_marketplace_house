import { deleteImageFromS3, uploadImageToS3 } from "../helpers/upload.js";
import { geocodeAddress } from "../helpers/google.js";
import slugify from "slugify";
import { nanoid } from "nanoid";
import Ad from "../models/ad.js";

import { incrementViewCount } from "../helpers/ad.js";

export const uploadImage = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        error: "No image files provided",
      });
    }

    const files = Array.isArray(req.files) ? req.files : [req.files];
    const results = await uploadImageToS3(files, req.user._id);
    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Error processing image uploads",
    });
  }
};

export const removeImage = async (req, res) => {
  const { Key, uploadedBy } = req.body;

  if (req.user._id.toString() !== uploadedBy.toString()) {
    return res.status(401).json({
      error: "Unauthorized",
    });
  }

  try {
    await deleteImageFromS3(Key);
    return res.json({
      success: trur,
    });
  } catch (error) {
    console.error("Error removing image:", error);
    return res.status(500).json({
      error: "Error removing image, Try Again!",
    });
  }
};

export const createAd = async (req, res) => {
  try {
    const {
      photos,
      description,
      address,
      propertyType,
      price,
      landsize,
      landsizetype,
      action,
    } = req.body;
    const isRequired = (v) => {
      res.json({
        error: `${v} is required`,
      });
      return;
    };
    if (!photos || photos.length === 0) return isRequired("Photo");
    if (!price) return isRequired("Price");
    if (!address) return isRequired("Address");
    if (!propertyType) return isRequired("Property type");
    if (!action) return isRequired("Action");
    if (!description) return isRequired("Description");
    if (propertyType === "Land") {
      if (!landsize) return isRequired("Land size");
      if (!landsizetype) return isRequired("Land size type");
    }

    let geo;
    try {
      geo = await geocodeAddress(address);

      const ad = await new Ad({
        ...req.body,
        slug: slugify(
          `${propertyType}-for-${action}-address-${address}-price-${price}-${nanoid(
            6
          )}`
        ),
        postedBy: req.user._id,
        location: {
          type: "Point",
          coordinates: [
            geo?.location?.coordinates[0],
            geo?.location?.coordinates[1],
          ],
        },
        googleMap: geo.googleMap,
      }).save();

      const user = await User.findByIdAndUpdate(req.user._id, {
        $addToSet: {
          role: "Seller",
        },
      });

      res.json({
        success: true,
      });
    } catch (err) {
      console.error("Geocoding error: ", err);
      return res.json({
        error: "Please enter a valid address",
      });
    }
  } catch (err) {
    console.error("Ad creation error:", err);
    res.status(500).json({
      error: "Failed to create ad. Please try again later!",
    });
  }
};

export const read = async (req, res) => {
  try {
    const { slug } = req.params;
    const ad = await Ad.findOne({
      slug,
    })
      .select("-googleMap")
      .populate("postedBy", "name username email phone company photo logo");
    if (!ad) {
      return res.status(404).json({
        error: "Ad not found",
      });
    }
    const related = await Ad.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: ad.location.coordinates,
          },
          distanceField: "dist.calculated",
          maxDistance: 50000,
          spherical: true,
        },
      },
      {
        $match: {
          _id: {
            $ne: ad._id,
          },
          action: ad.action,
          type: ad.type,
        },
      },
      {
        $limit: 3,
      },
      {
        $project: {
          googleMap: 0,
        },
      },
    ]);

    const relatedWithPopulatedPostedBy = await Ad.populate(related, {
      path: "postedBy",
      select: "name username email phone company photo logo",
    });
    res.json({
      ad,
      related: relatedWithPopulatedPostedBy,
    });
    incrementViewCount(ad._id);
  } catch (err) {
    console.log(err);
    res.status(500).json({
      error: "Failed to fetch. Try again.",
    });
  }
};

export const adsForSell = async (req, res) => {
  try {
    const page = req.params.page ? req.params.page : 1;
    const pageSize = 2;
    const skip = (page - 1) * pageSize;
    const totalAds = await Ad.countDocuments({
      action: "Sell",
    });
    const ads = await Ad.find({
      action: "Sell",
    })
      .populate("postedBy", "name username email phone company photo logo")
      .select("-googleMap")
      .skip(skip)
      .limit(pageSize)
      .sort({
        createAt: -1,
      });

    return res.json({
      ads,
      page,
      totalPages: Math.ceil(totalAds / pageSize),
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      error: "Failed to fetch. Try again!.",
    });
  }
};

export const adsForRent = async (req, res) => {
  try {
    const page = req.params.page ? req.params.page : 1;

    const pageSize = 2;

    const skip = (page - 1) * pageSize;
    const totalAds = await Ad.countDocuments({
      action: "Sell",
    });

    const ads = await Ad.find({
      action: "Rent",
    })
      .populate("postedBy", "name usernme email phone company photo logo")
      .select("-googleMap")
      .skip(skip)
      .limit(pageSize)
      .sort({
        createAd: -1,
      });

    return res.json({
      ads,
      page,
      totalPages: Math.ceil(totalAds / pageSize),
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      error: "Failed to fetch. Try Again!.",
    });
  }
};

export const updateAd = async (req, res) => {
  try {
    const { slug } = req.params;
    const {
      photos,
      description,
      address,
      propertyType,
      price,
      landsize,
      landsizetype,
      action,
    } = req.body;
    const isRequired = (v) => {
      res.json({
        error: `${v} is required`,
      });
      return;
    };
    if (!photos || photos.length === 0) return isRequired("Photo");
    if (!price) return isRequired("Price");
    if (!address) return isRequired("Address");
    if (!propertyType) return isRequired("Property type");
    if (!action) return isRequired("Action");
    if (!description) return isRequired("Description");
    if (propertyType === "Land") {
      if (!landsize) return isRequired("Land size");
      if (!landsizetype) return isRequired("Land size type");
    }

    const ad = await Ad.findOne({
      slug,
    }).populate("postedBy", "_id");

    if (!ad) {
      return res.status(404).json({
        error: "Ad not found!",
      });
    }

    if (ad.postedBy._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        error: "Unautorized",
      });
    }
    let geo;
    try {
      geo = await geocodeAddress(address);

      const updateAd = await Ad.findOneAndUpdate(
        {
          slug,
        },
        {
          ...req.body,
          slug: slugify(
            `${propertyType}-for-${action}-address-${address}-price-${price}-${nanoid(
              6
            )}`
          ),
          location: {
            type: "Point",
            coordinates: [
              geo?.location?.coordinates[0],
              geo?.location?.coordinates[1],
            ],
          },
          googleMap: geo.googleMap,
        },
        {
          new: true,
        }
      );
      res.json({
        success: true,
      });
    } catch (err) {
      console.error("Geocoding error: ", err);
      return res.json({
        error: "Please enter a valid address.",
      });
    }
  } catch (err) {
    console.error("Ad update error:", err);
    res.status(500).json({
      error: "Failed to update ad. Please try again later..",
    });
  }
};

export const deleteAd = async (req, res) => {
  try {
    const { slug } = req.params;

    const ad = await Ad.findOne({
      slug,
    });

    if (!ad) {
      return res.status(404).json({
        error: "Ad not found",
      });
    }

    if (ad.postedBy.toString() !== req.user._id.toString()) {
      return res.status(401).json({
        error: "Unauthorized",
      });
    }

    await Ad.deleteOne({
      slug,
    });
    res.json({
      success: true,
    });
  } catch (err) {
    console.error("Ad deletion error:", err);
    res.status(500).json({
      error: "Failed to delete ad. Please try again later!.",
    });
  }
};

export const userAds = async (req, res) => {
  try {
    const page = req.params.page ? req.params.page : 1;
    const pageSize = 2;
    const skip = (page - 1) * pageSize;
    const totalAds = await Ad.countDocuments({
      postedBy: req.user._id,
    });
    const ads = await Ad.find({
      postedBy: req.user._id,
    })
      .select("-googleMap")
      .populate("postedBy", "name username email phone company")
      .skip(skip)
      .limit(pageSize)
      .sort({
        createdAt: -1,
      });

    return res.json({
      ads,
      page,
      totalPages: Math.ceil(totalAds / pageSize),
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      error: "Failed to fetch. Try again!.",
    });
  }
};

export const updateAdStatus = async (req, res) => {
  try {
    const { slug } = req.params;
    const { status } = req.body;

    const ad = await Ad.findOne({
      slug,
    });

    if (!ad) {
      return res.status(404).json({
        error: "Ad not found",
      });
    }

    if (ad.postedBy.toString() !== req.user._id.toString()) {
      return res.status(401).json({
        error: "Unauthorized",
      });
    }

    ad.status = status;
    await ad.save();
    res.json({
      success: true,
      ad,
    });
  } catch (error) {
    console.error("Error updating ad status:", err);

    if (err.name === "ValidationError") {
      return res.status(400).json({
        error: err.message,
      });
    }
    res.status(500).json({
      error: "Failed to update ad status. Please try again later",
    });
  }
};

export const contactAgent = async (req, res) => {
  try {
    const { adId, message } = req.body;
    const ad = await Ad.findById(adId).populate("postedBy");
    if (!ad) {
      return res.status(404).json({
        error: "Ad not found",
      });
    }
    const user = await User.findByIdAndUpdate(req.user._id, {
      $addToSet: {
        enquiredProperties: ad._id,
      },
    });
    await sendContactEmailToAgent(ad, user, message);
    res.json({
      success: true,
    });
  } catch (err) {
    console.log(err);
    res.json({
      error: "Something went wrong. Please try again.",
    });
  }
};

export const sendContactEmailToAgent = async (ad, user, message) => {
  const params = {
    Source: process.env.EMAIL_FROM,
    ReplyToAddresses: [user.email],
    Destination: {
      ToAddresses: [ad.postedBy.email],
    },
    Message: {
      Body: {
        Html: {
          Charset: "UTF-8",
          Data: `
            <html>
            <p>Hi ${ad.postedBy.name},</p>
            <p>You have received a new enquiry from ${user.name} from
            ${process.env.CLIENT_URL}</p>
                <p><strong>Details:</strong></p>
                <ul>
                <li>Name: ${user.name}</li>
                <li>Email: <a
                href="mailto:${user.email}">${user.email}</a></li>
                <li>Phone: ${user.phone}</li>
                <li>Enquired ad: <a
                href="${process.env.CLIENT_URL}/ad/${ad.slug}">${ad.propertyType} for
                ${ad.action} - ${ad.address} (${ad.price})</a></li>
                </ul>
                <p><strong>Message:</strong></p>
                <p>${message}</p>
                <p>Best regards,<br/>Team ${process.env.APP_NAME}</p>
                </html>
                `,
        },
      },
      Subject: {
        Charset: "UTF-8",
        Data: `Enquiry received - ${process.env.APP_NAME}`,
      },
    },
  };
  const command = new SendEmailCommand(params);
  try {
    const data = await client.send(command);
    return data;
  } catch (error) {
    throw error;
  }
};

export const enquiredAds = async (req, res) => {
  try {
    const page = req.params.page ? parseInt(req.params.page) : 1;
    const pageSize = 2; // 24
    const skip = (page - 1) * pageSize;
    const user = await User.findById(req.user._id);
    // Use $in to find ads with IDs in user.enquiredProperties
    const totalAds = await Ad.countDocuments({
      _id: {
        $in: user.enquiredProperties,
      },
    });
    const ads = await Ad.find({
      _id: {
        $in: user.enquiredProperties,
      },
    })
      .select("-googleMap")
      .populate("postedBy", "name username email phone company")
      .skip(skip)
      .limit(pageSize)
      .sort({
        createdAt: -1,
      });
    return res.json({
      ads,
      page,
      totalPages: Math.ceil(totalAds / pageSize),
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      error: "Failed to fetch. Try again.",
    });
  }
};

export const toggleWishlist = async (req, res) => {
  try {
    const userId = req.user._id;
    const adId = req.params.adId;
    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        error: "User not found",
      });
    }
    // Check if the ad is already in the user's wishlist
    const isInWishlist = user.wishlist.includes(adId);
    // Toggle the wishlist
    const update = isInWishlist
      ? {
          $pull: {
            wishlist: adId,
          },
        }
      : {
          $addToSet: {
            wishlist: adId,
          },
        };
    // Update the user's wishlist
    const updatedUser = await User.findByIdAndUpdate(userId, update, {
      new: true,
    });
    res.json({
      success: true,
      message: isInWishlist
        ? "Ad removed from wishlist"
        : "Ad added to wishlist",
      wishlist: updatedUser.wishlist,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      error: "Failed to update wishlist. Try again.",
    });
  }
};

export const userWishlist = async (req, res) => {
  try {
    const page = req.params.page ? req.params.page : 1;
    const pageSize = 2; // Adjust as needed
    const skip = (page - 1) * pageSize;
    const user = await User.findById(req.user._id);
    const totalAds = await Ad.countDocuments({
      _id: {
        $in: user.wishlist,
      },
    });
    const ads = await Ad.find({
      _id: {
        $in: user.wishlist,
      },
    })
      .select("-googleMap")
      .populate("postedBy", "name username email phone company")
      .skip(skip)
      .limit(pageSize)
      .sort({
        createdAt: -1,
      });
    return res.json({
      ads,
      page,
      totalPages: Math.ceil(totalAds / pageSize),
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      error: "Failed to fetch. Try again.",
    });
  }
};

export const searchAds = async (req, res) => {
  try {
    const {
      address,
      price,
      page = 1,
      action,
      propertyType,
      bedrooms,
      bathrooms,
    } = req.body;
    const pageSize = 2; // Adjust as needed
    if (!address) {
      return res.status(400).json({
        error: "Address is required",
      });
    }
    // Geocode the address to get coordinates
    let geo = await geocodeAddress(address);
    // Function to check if a value is numeric
    const isNumeric = (value) => {
      return !isNaN(value) && !isNaN(parseFloat(value));
    };
    // Construct the query object with all search parameters
    let query = {
      // published: true,
      location: {
        $geoWithin: {
          $centerSphere: [
            [geo?.location?.coordinates[0], geo?.location?.coordinates[1]],
            10 / 6371, // 10km radius, converted to radians
          ],
        },
      },
    };
    if (action) {
      query.action = action;
    }
    if (propertyType && propertyType !== "All") {
      query.propertyType = propertyType;
    }
    if (bedrooms && bedrooms !== "All") {
      query.bedrooms = parseInt(bedrooms);
    }
    if (bathrooms && bathrooms !== "All") {
      query.bathrooms = parseInt(bathrooms);
    }
    // Add price range filter to the query only if it's a valid number
    if (isNumeric(price)) {
      const numericPrice = parseFloat(price);
      const minPrice = numericPrice * 0.8;
      const maxPrice = numericPrice * 1.2;
      query.price = {
        $regex: new RegExp(`^(${minPrice.toFixed(0)}|${maxPrice.toFixed(0)})`),
      };
    }
    // Fetch ads matching all criteria, including price range
    let ads = await Ad.find(query)
      .limit(pageSize)
      .skip((page - 1) * pageSize)
      .sort({
        createdAt: -1,
      })
      .select("-googleMap");
    // Count total matching ads for pagination
    let totalAds = await Ad.countDocuments(query);
    // Return response with matching ads and pagination information
    return res.json({
      ads,
      total: totalAds,
      page,
      totalPages: Math.ceil(totalAds / pageSize),
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      error: "Failed to search ads. Try again.",
    });
  }
};

export const togglePublished = async (req, res) => {
  try {
    const adId = req.params.adId;
    const ad = await Ad.findById(adId);
    // Update the published status
    const updatedAd = await Ad.findByIdAndUpdate(
      adId,
      {
        published: ad.published ? false : true,
      },
      {
        new: true,
      }
    );
    res.json({
      success: true,
      message: ad.published
        ? "Ad removed from wishlist"
        : "Ad added to wishlist",
      ad: updatedAd,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      error: "Failed to update published status. Try again.",
    });
  }
};
