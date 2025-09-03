import mongoose from "mongoose"
import {Comment} from "../models/comment.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getVideoComments = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query

    // Validate videoId
    if (!mongoose.isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID")
    }

    // Create aggregation pipeline
    const pipeline = [
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            fullName: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                owner: {
                    $first: "$owner"
                }
            }
        },
        {
            $sort: {
                createdAt: -1
            }
        }
    ]

    const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        customLabels: {
            totalDocs: "totalComments",
            docs: "comments"
        }
    }

    const comments = await Comment.aggregatePaginate(
        Comment.aggregate(pipeline),
        options
    )

    if (!comments) {
        throw new ApiError(500, "Failed to fetch comments")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, comments, "Comments fetched successfully"))
})

const addComment = asyncHandler(async (req, res) => {
    const {content} = req.body
    const {videoId} = req.params
    // Validate required fields
    if (!content || content.trim() === "") {
        throw new ApiError(400, "Comment content is required")
    }

    if (!mongoose.isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID")
    }

    // Create new comment
    const comment = await Comment.create({
        content: content.trim(),
        video: videoId,
        owner: req.user._id
    })

    if (!comment) {
        throw new ApiError(500, "Failed to create comment")
    }

    // Fetch the created comment with owner details
    const createdComment = await Comment.findById(comment._id)
        .populate("owner", "username fullName avatar")

    return res
        .status(201)
        .json(new ApiResponse(201, createdComment, "Comment added successfully"))
})

const updateComment = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    const {content} = req.body

    // Validate required fields
    if (!content || content.trim() === "") {
        throw new ApiError(400, "Comment content is required")
    }

    if (!mongoose.isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment ID")
    }

    // Find the comment
    const comment = await Comment.findById(commentId)
    
    if (!comment) {
        throw new ApiError(404, "Comment not found")
    }

    // Check if user is the owner of the comment
    if (comment.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to update this comment")
    }

    // Update the comment
    const updatedComment = await Comment.findByIdAndUpdate(
        commentId,
        {
            content: content.trim()
        },
        {
            new: true
        }
    ).populate("owner", "username fullName avatar")

    if (!updatedComment) {
        throw new ApiError(500, "Failed to update comment")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, updatedComment, "Comment updated successfully"))
})

const deleteComment = asyncHandler(async (req, res) => {
    const {commentId} = req.params

    // Validate commentId
    if (!mongoose.isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment ID")
    }

    // Find the comment
    const comment = await Comment.findById(commentId)
    
    if (!comment) {
        throw new ApiError(404, "Comment not found")
    }

    // Check if user is the owner of the comment
    if (comment.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to delete this comment")
    }

    // Delete the comment
    const deletedComment = await Comment.findByIdAndDelete(commentId)

    if (!deletedComment) {
        throw new ApiError(500, "Failed to delete comment")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Comment deleted successfully"))
})

export {
    getVideoComments, 
    addComment, 
    updateComment, 
    deleteComment
}