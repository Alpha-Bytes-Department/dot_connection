-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'delete');

-- CreateEnum
CREATE TYPE "MatchAction" AS ENUM ('skip', 'love', 'map');

-- CreateEnum
CREATE TYPE "ConnectionRequestStatus" AS ENUM ('pending', 'accepted', 'rejected');

-- CreateEnum
CREATE TYPE "ProfileLookingFor" AS ENUM ('friendship', 'dating', 'relationship', 'networking');

-- CreateEnum
CREATE TYPE "ProfileGender" AS ENUM ('male', 'female', 'other');

-- CreateEnum
CREATE TYPE "ProfileInterestedIn" AS ENUM ('male', 'female', 'everyone');

-- CreateEnum
CREATE TYPE "ProfileSmokingStatus" AS ENUM ('Yes', 'Occasionally', 'Prefer Not to Say', 'No');

-- CreateEnum
CREATE TYPE "ProfileDrinkingStatus" AS ENUM ('Yes', 'Occasionally', 'Prefer Not to Say', 'No');

-- CreateEnum
CREATE TYPE "ProfileStudyLevel" AS ENUM ('highSchool', 'underGraduation', 'postGraduation', 'preferNotToSay');

-- CreateEnum
CREATE TYPE "ProfileReligious" AS ENUM ('buddhist', 'christian', 'muslim', 'atheist', 'catholic', 'hindu', 'spiritual', 'jewish', 'agnostic', 'other', 'prefer_not_to_say');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('text', 'image', 'audio');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('match', 'message', 'connection_request', 'general');

-- CreateTable
CREATE TABLE "blocks" (
    "id" TEXT NOT NULL,
    "blockerId" TEXT NOT NULL,
    "blockedId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chats" (
    "id" TEXT NOT NULL,
    "userOneId" TEXT NOT NULL,
    "userTwoId" TEXT NOT NULL,
    "lastMessageId" TEXT,
    "lastMessageTime" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "connections" (
    "id" TEXT NOT NULL,
    "userOneId" TEXT NOT NULL,
    "userTwoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matches" (
    "id" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "action" "MatchAction" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "connection_requests" (
    "id" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "status" "ConnectionRequestStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "connection_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "message" TEXT,
    "image" TEXT,
    "audio" TEXT,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "messageType" "MessageType" NOT NULL DEFAULT 'text',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "relatedId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "data" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bio" TEXT,
    "location" JSONB,
    "address" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "interests" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lookingFor" "ProfileLookingFor",
    "maxDistance" INTEGER NOT NULL DEFAULT 25,
    "ageRangeMin" INTEGER,
    "ageRangeMax" INTEGER,
    "gender" "ProfileGender",
    "interestedIn" "ProfileInterestedIn",
    "height" INTEGER,
    "workplace" TEXT,
    "school" TEXT,
    "hometown" TEXT,
    "jobTitle" TEXT,
    "smokingStatus" "ProfileSmokingStatus",
    "drinkingStatus" "ProfileDrinkingStatus",
    "studyLevel" "ProfileStudyLevel",
    "religious" "ProfileReligious" DEFAULT 'prefer_not_to_say',
    "hiddenGender" BOOLEAN NOT NULL DEFAULT false,
    "hiddenHometown" BOOLEAN NOT NULL DEFAULT false,
    "hiddenWorkplace" BOOLEAN NOT NULL DEFAULT false,
    "hiddenJobTitle" BOOLEAN NOT NULL DEFAULT false,
    "hiddenSchool" BOOLEAN NOT NULL DEFAULT false,
    "hiddenStudyLevel" BOOLEAN NOT NULL DEFAULT false,
    "hiddenReligious" BOOLEAN NOT NULL DEFAULT false,
    "hiddenDrinkingStatus" BOOLEAN NOT NULL DEFAULT false,
    "hiddenSmokingStatus" BOOLEAN NOT NULL DEFAULT false,
    "profileViews" INTEGER NOT NULL DEFAULT 0,
    "lastActive" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" TEXT NOT NULL,
    "aboutUs" TEXT,
    "privacyPolicy" TEXT,
    "termsAndConditions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "phoneNumber" TEXT,
    "image" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "status" "UserStatus" NOT NULL DEFAULT 'active',
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "allProfileFieldsFilled" BOOLEAN NOT NULL DEFAULT false,
    "allUserFieldsFilled" BOOLEAN NOT NULL DEFAULT false,
    "isProfileVerified" BOOLEAN NOT NULL DEFAULT false,
    "isPersonaVerified" BOOLEAN NOT NULL DEFAULT false,
    "fcmToken" TEXT,
    "authOneTimeCode" TEXT,
    "authExpireAt" TIMESTAMP(3),
    "authLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "authLastLoginAttempt" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "dateOfBirth" TIMESTAMP(3),
    "pushNotification" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "blocks_blockerId_idx" ON "blocks"("blockerId");

-- CreateIndex
CREATE INDEX "blocks_blockedId_idx" ON "blocks"("blockedId");

-- CreateIndex
CREATE UNIQUE INDEX "blocks_blockerId_blockedId_key" ON "blocks"("blockerId", "blockedId");

-- CreateIndex
CREATE UNIQUE INDEX "chats_lastMessageId_key" ON "chats"("lastMessageId");

-- CreateIndex
CREATE INDEX "chats_lastMessageTime_idx" ON "chats"("lastMessageTime" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "chats_userOneId_userTwoId_key" ON "chats"("userOneId", "userTwoId");

-- CreateIndex
CREATE INDEX "connections_userOneId_userTwoId_idx" ON "connections"("userOneId", "userTwoId");

-- CreateIndex
CREATE INDEX "connections_createdAt_idx" ON "connections"("createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "connections_userOneId_userTwoId_key" ON "connections"("userOneId", "userTwoId");

-- CreateIndex
CREATE INDEX "matches_fromUserId_idx" ON "matches"("fromUserId");

-- CreateIndex
CREATE INDEX "matches_fromUserId_action_idx" ON "matches"("fromUserId", "action");

-- CreateIndex
CREATE INDEX "matches_toUserId_action_idx" ON "matches"("toUserId", "action");

-- CreateIndex
CREATE INDEX "matches_createdAt_idx" ON "matches"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "matches_fromUserId_createdAt_idx" ON "matches"("fromUserId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "matches_fromUserId_toUserId_action_idx" ON "matches"("fromUserId", "toUserId", "action");

-- CreateIndex
CREATE UNIQUE INDEX "matches_fromUserId_toUserId_key" ON "matches"("fromUserId", "toUserId");

-- CreateIndex
CREATE INDEX "connection_requests_toUserId_status_idx" ON "connection_requests"("toUserId", "status");

-- CreateIndex
CREATE INDEX "connection_requests_fromUserId_status_idx" ON "connection_requests"("fromUserId", "status");

-- CreateIndex
CREATE INDEX "connection_requests_createdAt_idx" ON "connection_requests"("createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "connection_requests_fromUserId_toUserId_key" ON "connection_requests"("fromUserId", "toUserId");

-- CreateIndex
CREATE INDEX "messages_senderId_receiverId_createdAt_idx" ON "messages"("senderId", "receiverId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "messages_receiverId_isRead_idx" ON "messages"("receiverId", "isRead");

-- CreateIndex
CREATE INDEX "messages_senderId_receiverId_isRead_idx" ON "messages"("senderId", "receiverId", "isRead");

-- CreateIndex
CREATE INDEX "messages_createdAt_idx" ON "messages"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");

-- CreateIndex
CREATE INDEX "notifications_type_idx" ON "notifications"("type");

-- CreateIndex
CREATE INDEX "notifications_isRead_idx" ON "notifications"("isRead");

-- CreateIndex
CREATE INDEX "notifications_userId_isRead_idx" ON "notifications"("userId", "isRead");

-- CreateIndex
CREATE INDEX "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "notifications_userId_type_isRead_idx" ON "notifications"("userId", "type", "isRead");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_userId_key" ON "profiles"("userId");

-- CreateIndex
CREATE INDEX "profiles_gender_idx" ON "profiles"("gender");

-- CreateIndex
CREATE INDEX "profiles_interests_idx" ON "profiles"("interests");

-- CreateIndex
CREATE INDEX "profiles_ageRangeMin_ageRangeMax_idx" ON "profiles"("ageRangeMin", "ageRangeMax");

-- CreateIndex
CREATE INDEX "profiles_lastActive_idx" ON "profiles"("lastActive" DESC);

-- CreateIndex
CREATE INDEX "profiles_createdAt_idx" ON "profiles"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "profiles_userId_gender_interestedIn_idx" ON "profiles"("userId", "gender", "interestedIn");

-- CreateIndex
CREATE INDEX "profiles_gender_interestedIn_idx" ON "profiles"("gender", "interestedIn");

-- CreateIndex
CREATE INDEX "profiles_latitude_longitude_idx" ON "profiles"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "profiles_address_idx" ON "profiles"("address");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phoneNumber_key" ON "users"("phoneNumber");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE INDEX "users_createdAt_idx" ON "users"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "users_verified_allProfileFieldsFilled_allUserFieldsFilled_s_idx" ON "users"("verified", "allProfileFieldsFilled", "allUserFieldsFilled", "status");

-- CreateIndex
CREATE INDEX "users_lastLoginAt_idx" ON "users"("lastLoginAt" DESC);

-- CreateIndex
CREATE INDEX "users_dateOfBirth_idx" ON "users"("dateOfBirth");

-- AddForeignKey
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chats" ADD CONSTRAINT "chats_userOneId_fkey" FOREIGN KEY ("userOneId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chats" ADD CONSTRAINT "chats_userTwoId_fkey" FOREIGN KEY ("userTwoId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chats" ADD CONSTRAINT "chats_lastMessageId_fkey" FOREIGN KEY ("lastMessageId") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connections" ADD CONSTRAINT "connections_userOneId_fkey" FOREIGN KEY ("userOneId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connections" ADD CONSTRAINT "connections_userTwoId_fkey" FOREIGN KEY ("userTwoId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connection_requests" ADD CONSTRAINT "connection_requests_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connection_requests" ADD CONSTRAINT "connection_requests_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
