import { Request,Response } from "express"
import MeetingService from "../../services/expert/Implimentation/meetingService"
import IMeetingService from "../../services/expert/IMeetingService"
import { STATUS_CODES } from "../../constants/statusCode"
import { ERROR_MESSAGES } from "../../constants/errorMessage"
interface CustomType extends Request{
    id?:string
}

class MeetingController{
    private meetngService :IMeetingService
    constructor(meetngService : IMeetingService){
        this.meetngService = meetngService
    }
    async getAdminExpertMeeting(req:CustomType , res:Response):Promise<void>{
        const expertId = req.id;
        if(!expertId){
            res.status(STATUS_CODES.BAD_REQUEST).json({status:false, message:ERROR_MESSAGES.UNAUTHORIZED})
            return
        }
        try {
            const meetingDetails = await this.meetngService.getAdminExpertMeeting(expertId)
            res.status(STATUS_CODES.OK).json({status:true, message:"data fetched successfully ", data: meetingDetails})
            
        } catch (error) {
            res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({status:false, message:ERROR_MESSAGES.INTERNAL_SERVER_ERROR})
            
        }
    }

    async verifyMeeting(req:CustomType, res:Response):Promise<void>{
        const {meetingId} = req.body;
        
        if( !meetingId ){
            res.status(STATUS_CODES.BAD_REQUEST).json({status: false, message:ERROR_MESSAGES.INVALID_INPUT});
            return; 
        }
        try {
            const getMeeting = await this.meetngService.verifymeeting(meetingId)
            if(getMeeting){
                res.status(STATUS_CODES.OK).json({status: true, message:"data fetched sucessfully",data:getMeeting})
                return
            }
            res.status(STATUS_CODES.BAD_REQUEST).json({status: false, message:"Invalid meeting"})

        } catch (error) {
            res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({status: false, message:ERROR_MESSAGES.INTERNAL_SERVER_ERROR})
        }
    }
}
export default MeetingController