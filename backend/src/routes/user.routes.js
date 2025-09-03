import { Router } from "express";
import { 
    acessRefreshToken, 
    changeCurrentPassword, 
    getCurrentUser, 
    getUserChannelProfile, 
    registerUser, 
    updateAccountDetails, 
    updateAvatar, 
    updatecoverImage, 
    userLogin, 
    userLogout, 
    watchHistory} 
    from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route('/register').post(
    upload.fields([
        {
            name:"avatar",
            maxCount:1
        },
        {
            name:"coverImage",
            maxCount:1
        }
    ]),
    registerUser);

router.route('/login').post(userLogin);

//secure Routes

router.route('/logout').post(verifyJWT,userLogout);
router.route ('/refresh-token').post(acessRefreshToken);
router.route('/change-password').post(verifyJWT,changeCurrentPassword);
router.route('/current-user').get(verifyJWT,getCurrentUser);
router.route('/update-account').patch(verifyJWT,updateAccountDetails)


router.route('/avatar').patch(verifyJWT,upload.single("avatar"),updateAvatar)
router.route('/cover-image').patch(verifyJWT,upload.single("coverImage"),updatecoverImage);


router.route('/c/:username').get(verifyJWT,getUserChannelProfile);
router.route('/history').get(verifyJWT,watchHistory);


export default router;
