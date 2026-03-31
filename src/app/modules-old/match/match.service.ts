import { StatusCodes } from "http-status-codes";
import { QueryBuilder } from "../../builder/QueryBuilder";
import AppError from "../../errors/AppError";
import {
  TReturnMatch,
  TConnectionRequest,
  TMatchAction,
} from "./match.interface";
import { Match, ConnectionRequest, Connection } from "./match.model";
import { User } from "../user/user.model";
import { Profile } from "../profile/profile.model";
import mongoose from "mongoose";
import { NotificationServices } from "../notification/notification.service";

// Get potential matches for user (users they haven't interacted with and match preferences)
const getPotentialMatches = async (
  userId: string,
  query: Record<string, unknown>
): Promise<TReturnMatch.getPotentialMatches> => {
  const startTime = Date.now();
  
  // Get current user's profile to access their preferences (optimized with lean and select)
  const currentUserProfile = await Profile.findOne({ userId })
    .select('gender interestedIn location')
    .lean()
    .exec();
console.log(currentUserProfile);
  if (!currentUserProfile) {
    throw new AppError(StatusCodes.NOT_FOUND, "User profile not found");
  }

  console.log(`[Performance] Profile fetch: ${Date.now() - startTime}ms`);
  const step2Start = Date.now();

  // Get current user's location for distance calculation
  const currentUserLocation = currentUserProfile.location?.coordinates;

  // Get users this user has already interacted with (optimized with lean)
  const interactedUsers = await Match.find({ fromUserId: userId })
    .select('toUserId -_id')
    .lean()
    .exec();
  
  const interactedUserIds = interactedUsers.map((match) => match.toUserId);
  // Add current user to exclude list
  interactedUserIds.push(new mongoose.Types.ObjectId(userId));

  console.log(`[Performance] Interacted users fetch: ${Date.now() - step2Start}ms (${interactedUserIds.length} users)`);

  // Use aggregation to properly join with profiles and filter
  const aggregationPipeline: any[] = [
    // Stage 1: Match basic user criteria first (most selective operation)
    {
      $match: {
        _id: { $nin: interactedUserIds },
        verified: true,
        allProfileFieldsFilled: true,
        allUserFieldsFilled: true,
        status: "active",
        dateOfBirth: { $exists: true }, // Ensure DOB exists for age calculation
      },
    },
    // Stage 2: Lookup profile data with pre-filtering in the pipeline
    {
      $lookup: {
        from: "profiles",
        localField: "_id",
        foreignField: "userId",
        as: "profile",
        pipeline: [
          // Filter by gender preferences within the lookup
          {
            $match: {
              $and: [
                // Current user's gender preference
                currentUserProfile.interestedIn === "everyone"
                  ? {}
                  : { gender: currentUserProfile.interestedIn },
                // Mutual interest
                {
                  $or: [
                    { interestedIn: "everyone" },
                    { interestedIn: currentUserProfile.gender },
                  ],
                },
              ],
            },
          },
          // Project only needed fields from profile
          {
            $project: {
              _id: 1,
              userId: 1,
              bio: 1,
              gender: 1,
              religious: 1,
              drinkingStatus: 1,
              smokingStatus: 1,
              interests: 1,
              jobTitle: 1,
              location: 1,
              photos: 1,
              height: 1,
              workplace: 1,
              hometown: 1,
              school: 1,
              studyLevel: 1,
              lookingFor: 1,
              hiddenFields: 1,
            },
          },
        ],
      },
    },
    // Stage 3: Unwind and exclude users without matching profiles
    {
      $unwind: {
        path: "$profile",
        preserveNullAndEmptyArrays: false, // Exclude users without matching profiles
      },
    },
    // Stage 4: Add calculated fields (age and distance)
    {
      $addFields: {
        // Calculate age from date of birth
        age: {
          $floor: {
            $divide: [
              { $subtract: [new Date(), "$dateOfBirth"] },
              31557600000, // milliseconds in a year (365.25 days)
            ],
          },
        },
        // Calculate distance if both users have location (Haversine formula with safety checks)
        distance: currentUserLocation
          ? {
              $cond: {
                if: { $ifNull: ["$profile.location.coordinates", false] },
                then: {
                  $round: [
                    {
                      $multiply: [
                        {
                          $acos: {
                            // Add min/max to prevent domain errors
                            $max: [
                              -1,
                              {
                                $min: [
                                  1,
                                  {
                                    $add: [
                                      {
                                        $multiply: [
                                          {
                                            $sin: {
                                              $degreesToRadians: currentUserLocation[1],
                                            },
                                          },
                                          {
                                            $sin: {
                                              $degreesToRadians: {
                                                $arrayElemAt: [
                                                  "$profile.location.coordinates",
                                                  1,
                                                ],
                                              },
                                            },
                                          },
                                        ],
                                      },
                                      {
                                        $multiply: [
                                          {
                                            $cos: {
                                              $degreesToRadians: currentUserLocation[1],
                                            },
                                          },
                                          {
                                            $cos: {
                                              $degreesToRadians: {
                                                $arrayElemAt: [
                                                  "$profile.location.coordinates",
                                                  1,
                                                ],
                                              },
                                            },
                                          },
                                          {
                                            $cos: {
                                              $degreesToRadians: {
                                                $subtract: [
                                                  {
                                                    $arrayElemAt: [
                                                      "$profile.location.coordinates",
                                                      0,
                                                    ],
                                                  },
                                                  currentUserLocation[0],
                                                ],
                                              },
                                            },
                                          },
                                        ],
                                      },
                                    ],
                                  },
                                ],
                              },
                            ],
                          },
                        },
                        6371, // Earth's radius in kilometers
                      ],
                    },
                    2, // Round to 2 decimal places
                  ],
                },
                else: null,
              },
            }
          : null,
      },
    },
    // Stage 5: Project only required fields
    {
      $project: {
        _id: 1,
        email: 1,
        image: 1,
        phoneNumber: 1,
        dateOfBirth: 1,
        firstName: 1,
        lastName: 1,
        isPersonaVerified: { $ifNull: ["$isPersonaVerified", false] },
        lastLoginAt: 1,
        age: 1, // Calculated age
        distance: 1, // Calculated distance in km
        profile: 1, // Include entire profile object (already filtered)
      },
    },
    // Stage 6: Sort by distance (nulls last) then by last login
    {
      $sort: {
        distance: 1,
        lastLoginAt: -1,
      },
    },
  ];

  console.log(`[Performance] Pipeline setup: ${Date.now() - startTime}ms`);
  const step3Start = Date.now();

  // Add pagination if specified
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;

  // Execute count and results in parallel for better performance
  const [totalResult, result] = await Promise.all([
    User.aggregate([
      ...aggregationPipeline.slice(0, 3), // Only need first 3 stages for count
      { $count: "total" },
    ]).allowDiskUse(true),
    User.aggregate([
      ...aggregationPipeline,
      { $skip: skip },
      { $limit: limit },
    ]).allowDiskUse(true),
  ]);

  console.log(`[Performance] Aggregation execution: ${Date.now() - step3Start}ms`);

  const total = totalResult[0]?.total || 0;

  // Calculate total pages
  const totalPage = Math.ceil(total / limit);

  console.log(`[Performance] Found ${result.length} results out of ${total} total (Page ${page}/${totalPage})`);

  // Validate page number - if page is beyond available pages, return empty results
  if (page > totalPage && total > 0) {
    console.log(
      `Requested page ${page} is beyond available pages (${totalPage}). Returning empty results.`
    );
    return {
      result: [],
      meta: {
        page,
        limit,
        total,
        totalPage,
      },
    };
  }

  // Filter out hidden fields from profiles (only check fields we're returning)
  const filteredResult = result.map((user) => {
    if (user.profile && user.profile.hiddenFields) {
      const hiddenFields = user.profile.hiddenFields;

      // Remove fields that are marked as hidden (only the ones we're returning)
      if (hiddenFields.gender === true) delete user.profile.gender;
      if (hiddenFields.jobTitle === true) delete user.profile.jobTitle;
      if (hiddenFields.religious === true) delete user.profile.religious;
      if (hiddenFields.drinkingStatus === true) delete user.profile.drinkingStatus;
      if (hiddenFields.smokingStatus === true) delete user.profile.smokingStatus;
      if (hiddenFields.height === true) delete user.profile.height;
      if (hiddenFields.workplace === true) delete user.profile.workplace;
      if (hiddenFields.hometown === true) delete user.profile.hometown;
      if (hiddenFields.school === true) delete user.profile.school;
      if (hiddenFields.studyLevel === true) delete user.profile.studyLevel;
      if (hiddenFields.lookingFor === true) delete user.profile.lookingFor;
    }
    return user;
  });

  console.log(`[Performance] Total request time: ${Date.now() - startTime}ms`);

  const meta = {
    page,
    limit,
    total,
    totalPage,
  };

  return { result: filteredResult, meta };
};

// Perform action on a user (skip, love)
const performAction = async (
  fromUserId: string,
  toUserId: string,
  action: TMatchAction
): Promise<{
  message: string;
  isMatch?: boolean;
  connectionRequest?: TConnectionRequest;
}> => {
  // Check if target user exists and is valid for matching
  const targetUser = await User.findById(toUserId);
  if (
    !targetUser ||
    !targetUser.verified ||
    !targetUser.allUserFieldsFilled ||
    !targetUser.allProfileFieldsFilled ||
    targetUser.status !== "active"
  ) {
    throw new AppError(
      StatusCodes.NOT_FOUND,
      "User not found or not available for matching"
    );
  }

  // Check if user is trying to match with themselves
  if (fromUserId === toUserId) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "Cannot perform action on yourself"
    );
  }

  // Check if already interacted with this user
  const existingMatch = await Match.findOne({ fromUserId, toUserId });
  if (existingMatch) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "You have already interacted with this user"
    );
  }

  // Create match record
  await Match.create({
    fromUserId,
    toUserId,
    action,
  });

  let responseData: any = {
    message: `Action '${action}' performed successfully`,
  };

  // If action is 'love', check for mutual love and handle accordingly
  if (action === "love") {
    const isMutualLove = await Match.checkMutualLove(fromUserId, toUserId);

    if (isMutualLove) {
      // AUTO-ACCEPT: Create connection immediately (they matched!)
      const connection = await Connection.create({
        userIds: [fromUserId, toUserId],
      });

      // Auto-accept any existing pending request
      await ConnectionRequest.findOneAndUpdate(
        {
          fromUserId: toUserId,
          toUserId: fromUserId,
          status: "pending",
        },
        { status: "accepted" }
      );

      responseData.isMatch = true;
      responseData.connection = connection;
      responseData.message =
        "It's a match! 🎉 Connection created automatically";

      // Send push notification to the other user about the match
      try {
        // Get sender's name for personalized notification
        const fromUser = await User.findById(fromUserId).select('firstName lastName').lean();
        const senderName = fromUser ? `${fromUser.firstName || ''} ${fromUser.lastName || ''}`.trim() : 'Someone';
        
        await NotificationServices.sendNotificationIfNotBlocked(
          fromUserId,
          toUserId,
          "It's a Match! 🎉",
          `You and ${senderName} liked each other!`,
          'match',
          new mongoose.Types.ObjectId(connection._id),
          {
            matchedUserId: fromUserId,
            connectionId: connection._id.toString(),
          }
        );
      } catch (error) {
        console.error('Failed to send match notification:', error);
        // Don't throw error, match is still successful
      }
    } else {
      // Create connection request (one-sided love)
      const connectionRequest = await ConnectionRequest.create({
        fromUserId,
        toUserId,
        status: "pending",
      });

      responseData.connectionRequest = connectionRequest;
      responseData.message = "Love sent! Waiting for their response ❤️";
      
      // Send push notification about connection request
      try {
        const fromUser = await User.findById(fromUserId).select('firstName lastName').lean();
        const senderName = fromUser ? `${fromUser.firstName || ''} ${fromUser.lastName || ''}`.trim() : 'Someone';
        
        await NotificationServices.sendNotificationIfNotBlocked(
          fromUserId,
          toUserId,
          "New Connection Request ❤️",
          `${senderName} likes you!`,
          'connection_request',
          new mongoose.Types.ObjectId(connectionRequest._id),
          {
            requesterId: fromUserId,
            requestId: connectionRequest._id.toString(),
          }
        );
      } catch (error) {
        console.error('Failed to send connection request notification:', error);
        // Don't throw error, request is still created
      }
    }
  }

  return responseData;
};

// Get connection requests received by user
const getConnectionRequests = async (
  userId: string,
  query: Record<string, unknown>
): Promise<TReturnMatch.getConnectionRequests> => {
  // Get current user's profile for location
  const currentUserProfile = await Profile.findOne({ userId })
    .select('location')
    .lean()
    .exec();

  const currentUserLocation = currentUserProfile?.location?.coordinates;

  // Get pagination parameters
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;

  // Build aggregation pipeline
  const aggregationPipeline: any[] = [
    // Match pending connection requests
    {
      $match: {
        toUserId: new mongoose.Types.ObjectId(userId),
        status: "pending"
      }
    },
    // Lookup sender user data
    {
      $lookup: {
        from: "users",
        localField: "fromUserId",
        foreignField: "_id",
        as: "fromUser"
      }
    },
    {
      $unwind: "$fromUser"
    },
    // Lookup sender profile data
    {
      $lookup: {
        from: "profiles",
        localField: "fromUserId",
        foreignField: "userId",
        as: "profile",
        pipeline: [
          {
            $project: {
              _id: 1,
              userId: 1,
              bio: 1,
              gender: 1,
              religious: 1,
              drinkingStatus: 1,
              smokingStatus: 1,
              interests: 1,
              jobTitle: 1,
              location: 1,
              photos: 1,
              height: 1,
              workplace: 1,
              hometown: 1,
              school: 1,
              studyLevel: 1,
              lookingFor: 1
            }
          }
        ]
      }
    },
    {
      $unwind: {
        path: "$profile",
        preserveNullAndEmptyArrays: true
      }
    },
    // Add calculated fields
    {
      $addFields: {
        // Calculate age from date of birth
        age: {
          $cond: {
            if: { $ifNull: ["$fromUser.dateOfBirth", false] },
            then: {
              $floor: {
                $divide: [
                  { $subtract: [new Date(), "$fromUser.dateOfBirth"] },
                  31557600000 // milliseconds in a year (365.25 days)
                ]
              }
            },
            else: null
          }
        },
        // Calculate distance if both users have location
        distance: currentUserLocation
          ? {
              $cond: {
                if: { $ifNull: ["$profile.location.coordinates", false] },
                then: {
                  $round: [
                    {
                      $multiply: [
                        {
                          $acos: {
                            $max: [
                              -1,
                              {
                                $min: [
                                  1,
                                  {
                                    $add: [
                                      {
                                        $multiply: [
                                          {
                                            $sin: {
                                              $degreesToRadians: currentUserLocation[1]
                                            }
                                          },
                                          {
                                            $sin: {
                                              $degreesToRadians: {
                                                $arrayElemAt: [
                                                  "$profile.location.coordinates",
                                                  1
                                                ]
                                              }
                                            }
                                          }
                                        ]
                                      },
                                      {
                                        $multiply: [
                                          {
                                            $cos: {
                                              $degreesToRadians: currentUserLocation[1]
                                            }
                                          },
                                          {
                                            $cos: {
                                              $degreesToRadians: {
                                                $arrayElemAt: [
                                                  "$profile.location.coordinates",
                                                  1
                                                ]
                                              }
                                            }
                                          },
                                          {
                                            $cos: {
                                              $degreesToRadians: {
                                                $subtract: [
                                                  {
                                                    $arrayElemAt: [
                                                      "$profile.location.coordinates",
                                                      0
                                                    ]
                                                  },
                                                  currentUserLocation[0]
                                                ]
                                              }
                                            }
                                          }
                                        ]
                                      }
                                    ]
                                  }
                                ]
                              }
                            ]
                          }
                        },
                        6371 // Earth's radius in kilometers
                      ]
                    },
                    2 // Round to 2 decimal places
                  ]
                },
                else: null
              }
            }
          : null
      }
    },
    // Project final structure
    {
      $project: {
        _id: 1,
        fromUserId: 1,
        toUserId: 1,
        status: 1,
        createdAt: 1,
        updatedAt: 1,
        profile: 1,
        age: 1,
        distance: 1
      }
    },
    // Sort by creation date (newest first)
    {
      $sort: { createdAt: -1 }
    }
  ];

  // Execute count and results in parallel
  const [totalResult, result] = await Promise.all([
    ConnectionRequest.aggregate([
      ...aggregationPipeline.slice(0, 1), // Only match stage for count
      { $count: "total" }
    ]),
    ConnectionRequest.aggregate([
      ...aggregationPipeline,
      { $skip: skip },
      { $limit: limit }
    ])
  ]);

  const total = totalResult[0]?.total || 0;
  const totalPage = Math.ceil(total / limit);

  const meta = {
    page,
    limit,
    total,
    totalPage
  };

  return { result, meta };
};

// Respond to connection request (accept/reject)
const respondToConnectionRequest = async (
  requestId: string,
  userId: string,
  action: "accept" | "reject"
): Promise<{ message: string; connection?: any }> => {
  const request = await ConnectionRequest.findById(requestId);

  if (!request) {
    throw new AppError(StatusCodes.NOT_FOUND, "Connection request not found");
  }

  if (request.toUserId.toString() !== userId) {
    throw new AppError(
      StatusCodes.FORBIDDEN,
      "You can only respond to your own requests"
    );
  }

  if (request.status !== "pending") {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "Request has already been responded to"
    );
  }

  // Update request status
  request.status = action === "accept" ? "accepted" : "rejected";
  await request.save();

  let responseData: any = {
    message:
      action === "accept"
        ? "Connection request accepted! 🎉"
        : "Connection request rejected",
  };

  // If accepted, create connection
  if (action === "accept") {
    const connection = await Connection.create({
      userIds: [request.fromUserId, request.toUserId],
    });

    responseData.connection = connection;
  }

  return responseData;
};

// Get user's connections
const getConnections = async (
  userId: string,
  query: Record<string, unknown>
): Promise<TReturnMatch.getConnections> => {
  const connectionQuery = new QueryBuilder(
    Connection.find({ userIds: userId }),
    query
  )
    .sort()
    .paginate();

  const result = await connectionQuery.modelQuery.populate(
    "userIds",
    "firstName lastName image verified"
  );
  const meta = await connectionQuery.countTotal();

  return { result, meta };
};

// Get user's match history
const getMatchHistory = async (
  userId: string,
  query: Record<string, unknown>
): Promise<TReturnMatch.getAllMatches> => {
  const matchQuery = new QueryBuilder(Match.find({ fromUserId: userId }), query)
    .sort()
    .paginate();

  const result = await matchQuery.modelQuery.populate(
    "toUserId",
    "firstName lastName image verified"
  );
  const meta = await matchQuery.countTotal();

  return { result, meta };
};

// Get sent connection requests
const getSentRequests = async (
  userId: string,
  query: Record<string, unknown>
): Promise<TReturnMatch.getConnectionRequests> => {
  const requestQuery = new QueryBuilder(
    ConnectionRequest.find({ fromUserId: userId }),
    query
  )
    .sort()
    .paginate();

  const result = await requestQuery.modelQuery.populate(
    "toUserId",
    "firstName lastName image verified"
  );
  const meta = await requestQuery.countTotal();

  return { result, meta };
};

export const MatchServices = {
  getPotentialMatches,
  performAction,
  getConnectionRequests,
  respondToConnectionRequest,
  getConnections,
  getMatchHistory,
  getSentRequests,
};
