import { Request,Response } from "express"
import ExpertService from "../../services/expert/Implimentation/expertServices"
import PasswordUtils from "../../utils/passwordUtils";
import JwtUtility from "../../utils/jwtUtility";
import { ExpertDocument } from "../../model/expert/expertModel";
import MailUtility from "../../utils/mailUtility";
import OtpUtility from "../../utils/otpUtility";
import IExpertService from "../../services/expert/IExpertService";
import IUserService from "../../services/user/IUserService";
import { STATUS_CODES } from "../../constants/statusCode";
import { ERROR_MESSAGES } from "../../constants/errorMessage";
import { CustomResponse } from "../../utils/customResponse";
import { UserType } from "../../model/user/userModel";
import { SUCESS_MESSAGE } from "../../constants/sucessMessage";

class ExpertController{ 
     private expertServece : IExpertService
     private _userService  : IUserService
    constructor(expertServece:IExpertService, userService : IUserService){
        this.expertServece = expertServece
        this._userService = userService
     }

    async signupPost(req: Request, res: Response):Promise<void>{
        const { email, password} =  req.body;
        if(!email.trim() || !password.trim())
        {
            res.status(STATUS_CODES.BAD_REQUEST).json({ status: false ,  message:ERROR_MESSAGES.INVALID_INPUT, data: null}  as CustomResponse<null>)
            return;
        }
        const existExpert = await this.expertServece.getExpertByEmail(email)
        if(existExpert && existExpert.status ===1)
        {
            res.status(STATUS_CODES.BAD_REQUEST).json({status: false ,  message:ERROR_MESSAGES.USER_ALREADY_EXIST, data: null}  as CustomResponse<null>)
            return;
        }
        try {
          if(!existExpert){
            req.body.password =  await PasswordUtils.passwordHash(password)
            const createExpert= await this.expertServece.createExpert(req.body)
          }
            
                const otp = await OtpUtility.otpGenerator()
                const emailSend = await MailUtility.sendMail(email,otp,"Verifivation OTP")
                res.status(STATUS_CODES.OK).json({status:true, message:SUCESS_MESSAGE.OTP_GENERATED, data : {otp,email}}  as CustomResponse<{otp:number,email:string}>)
        } catch (error) {
            res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({status: false, message:ERROR_MESSAGES.INTERNAL_SERVER_ERROR, data: null}  as CustomResponse<null>)
        }
     }

    async loginPost(req:Request , res:Response):Promise<void>{
        const {email,password} = req.body
        if(!email.trim() || !password.trim())
        {
            res.status(STATUS_CODES.BAD_REQUEST).json({status:false, message:ERROR_MESSAGES.INVALID_INPUT,data:null}  as CustomResponse<null>);
            return;
        } 
        const existExpert =  await this.expertServece.getExpertByEmail(email)
        if(!existExpert || !existExpert.password)
        {
            res.status(STATUS_CODES.BAD_REQUEST).json({status:false, message:ERROR_MESSAGES.USER_NOT_FOUND,data:null}  as CustomResponse<null>);
            return;
        }else if(!existExpert.status){
          res.status(STATUS_CODES.FORBIDDEN).json({status:false, message:ERROR_MESSAGES.BLOCKD_USER,data:null}  as CustomResponse<null>);
          return;
        }
        const checkPassword = await PasswordUtils.comparePassword(password,existExpert.password)
        if(!checkPassword)
        {
            res.status(STATUS_CODES.BAD_REQUEST).json({status:false, message:ERROR_MESSAGES.INCORRECT_PASSWORD,data:null}  as CustomResponse<null>);
            return;
        }
        else
        {
            const accessToken = JwtUtility.generateAccessToken({email,id:existExpert._id})
            const refreshToken = JwtUtility.generateRefreshToken({email,id:existExpert._id})
            res.cookie("refreshToken", refreshToken, {
              httpOnly: true,
              secure: process.env.NODE_ENV === "production",
              sameSite: "lax",
              maxAge: 1 * 60 * 60 * 1000,
            });
            const { password, ...expertData } = existExpert.toObject()
            res.status(STATUS_CODES.OK).json({status:true, message:SUCESS_MESSAGE.LOGIN_SUCESS,data:{ accessToken, existExpert: expertData }} as CustomResponse<{accessToken:string,existExpert:ExpertDocument}>);
        }
     }

    async verifyOtp(req: Request, res: Response): Promise<void> {
        const {otp,storedOTP,storedEmail} = req.body;
        if (!otp) {
          res.status(STATUS_CODES.BAD_REQUEST).json({ message: ERROR_MESSAGES.INVALID_INPUT } as  CustomResponse<null>);
          return;
        }
    
        
        if (!otp || !storedOTP || !storedEmail) {
          res.status(STATUS_CODES.BAD_REQUEST).json({ message:ERROR_MESSAGES.OTP_EXPIRED } as  CustomResponse<null>);
          return;
        }
        if (storedOTP === otp) {
          const currentUser = await this.expertServece.getExpertByEmail(storedEmail);
          if (!currentUser) {
            res.status(STATUS_CODES.NOT_FOUND).json({ message: ERROR_MESSAGES.USER_NOT_FOUND } as  CustomResponse<null>);
            return;
          }
    
          const userData: ExpertDocument = { ...currentUser.toObject(), status: 1 };
          const updateUser = await this.expertServece.updateExpert(currentUser._id, userData);
    
          if (updateUser) {
            res
              .status(STATUS_CODES.OK)
              .json({ message: SUCESS_MESSAGE.OTP_VERIFIED, user: updateUser });
          } else {
            res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ message: ERROR_MESSAGES.UPDATION_FAILED } as  CustomResponse<null>);
          }
        } else {
          res.status(STATUS_CODES.BAD_REQUEST).json({ message: ERROR_MESSAGES.INCORRECT_OTP } as  CustomResponse<null>);
        }
     }
     async forgotPassword(req: Request, res: Response):Promise<void>{
      const {email}= req.body;
      if(!email){
        res.status(STATUS_CODES.BAD_REQUEST).json({status: false, message : ERROR_MESSAGES.INVALID_INPUT} as  CustomResponse<null>);
        return
      }
      try {
        const userExist = await this.expertServece.getExpertByEmail(email)
      if(!userExist){
        res.status(STATUS_CODES.BAD_REQUEST).json({status: false, message : ERROR_MESSAGES.USER_NOT_FOUND} as  CustomResponse<null>);
        return
      }
      else if(userExist.status !== 1){
        res.status(STATUS_CODES.FORBIDDEN).json({status: false, message : ERROR_MESSAGES.BLOCKD_USER} as  CustomResponse<null>);
        return
      }
      const otp = await OtpUtility.otpGenerator()
      const emailSend =  await MailUtility.sendMail(email,otp,"Reset Password")
      if(emailSend){
        res.status(STATUS_CODES.OK).json({status: true, message : SUCESS_MESSAGE.OTP_GENERATED,data:{email, otp}} as  CustomResponse<{email:string,otp:number}>);
        return
      }
      } catch (error) {
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({status: false, message : ERROR_MESSAGES.INTERNAL_SERVER_ERROR} as  CustomResponse<null>);
      }
     }
     async updatePassword (req:Request , res : Response):Promise<void>{
      const {email,password}= req.body;
      if(!email || !password){
        res.status(STATUS_CODES.BAD_REQUEST).json({status: false, message : ERROR_MESSAGES.UNAUTHORIZED} as  CustomResponse<null>);
      }
      try {
        const existeUser =  await this.expertServece.getExpertByEmail(email)
        if(!existeUser){
          res.status(STATUS_CODES.BAD_REQUEST).json({status: false, message : ERROR_MESSAGES.UNABLE_FIND_USER} as  CustomResponse<null>);
          return
        }
        else if(existeUser.status !== 1){
          res.status(STATUS_CODES.FORBIDDEN).json({status: false, message :ERROR_MESSAGES.BLOCKD_USER} as  CustomResponse<null>);
          return
        }

        const hashPassword = await PasswordUtils.passwordHash(password)
        const data = {password : hashPassword} as ExpertDocument;
        const updatePassword = await this.expertServece.updateExpert(existeUser._id, data)
        if(updatePassword){
        res.status(STATUS_CODES.OK).json({status: true, message : SUCESS_MESSAGE.UPDATION_SUCESS} as  CustomResponse<null>);
          return 
        }
        else
        res.status(STATUS_CODES.BAD_REQUEST).json({status: false, message : ERROR_MESSAGES.UPDATION_FAILED} as  CustomResponse<null>);

      } catch (error) {
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({status: false, message : ERROR_MESSAGES.INTERNAL_SERVER_ERROR} as  CustomResponse<null>);
      }
     }

     async googleSignup(req:Request, res:Response):Promise<void>{
      const { name, email, image } = await req.body;
    
    if (!email) {
      res.status(STATUS_CODES.BAD_REQUEST).json({ status: false, message: ERROR_MESSAGES.INVALID_INPUT } as  CustomResponse<null>);
      return;
    } 
    try {
      let userData = await this.expertServece.getExpertByEmail(email)
    if(!userData){
    const data =  {email, first_name:name, profilePicture:image, status:1} as ExpertDocument
     userData =  await this.expertServece.createExpert(data)
    }
    if(userData && userData.status===1){
      const accessToken = JwtUtility.generateAccessToken({
        email: email,
        id: userData._id,
      }); 
      const refreshToken = JwtUtility.generateRefreshToken({
        email: email,
        id: userData._id,
      });
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 1 * 60 * 60 * 1000,
      });
      res.status(STATUS_CODES.OK).json({status:true, message:SUCESS_MESSAGE.SIGNUP_SUCESS, data:{userData,token: accessToken}} as  CustomResponse<{userData:UserType,token:string}>)
      return;
    }
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({status:false, message:ERROR_MESSAGES.UNABLE_SIGNUP} as  CustomResponse<null>)
    
    } catch (error) {
      res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({status:false, message:ERROR_MESSAGES.UNABLE_SIGNUP} as  CustomResponse<null>)
    }
     }

     async getUserProfileById(req:Request, res: Response):Promise<void>{
      const userId = req.params.id
      try {
        if(!userId){
        res.status(STATUS_CODES.BAD_REQUEST).json({ status: false, message:ERROR_MESSAGES.INVALID_INPUT} as  CustomResponse<null>)
        return
        }

        const userData  =  await this._userService.getUserById(userId)
        if(userData)
          res.status(STATUS_CODES.OK).json({status: true, message:SUCESS_MESSAGE.DATA_FETCH_SUCESS, data: userData} as  CustomResponse<UserType>)
      } catch (error) {
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ status: false, message:ERROR_MESSAGES.INTERNAL_SERVER_ERROR} as  CustomResponse<null>)
      }
     }

    
}

export default ExpertController