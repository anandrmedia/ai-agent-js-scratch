import OpenAI from "openai";
import readline from "readline";

const client = new OpenAI({
    apiKey: ""
});

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const messages = [] as any;

/**
 * Function to get the timezone
 * @param timeZone 
 * @returns 
 */
function getCurrentTimeInTimeZone(timeZone: string) {
    return new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: true, // For AM/PM format
    }).format(new Date());
  }

const SYSTEM_PROMPT = `
You are an appointment scheduler AI agent. You're always interacting with a system. You have the ability to do function calls. 
Your response can be either a reply to the user, or to the system to do a function call. But you cannot reply to the user and system in the same response.
So your response should be in JSON format as specified. -

{
	"to": ""
	"message": "",
	"function_call": {
	   "function": "",
	   "arguments": []
	}
}

I will explain the keys -

1. to - values could be system or user, depending on whom you are replying
2. message - plain text message. Use this only if you are replying to the user not system
3. function_call - Use this only if you are replying to the system. It is a JSON object that determines which function to call, and it's arguments.
4 a. function - name of the function
4 b. arguments - An array of arguments for the function call where each array item is the value for the argument.

Available functions:

function name - check_appointment_availability
arguments - datetime (ISO 8601 format, UTC timezone)

function name - schedule_appointment
arguments - datetime (ISO 8601 format, UTC timezone), name (String), email (string)

function name - delete_appointment
arguments - datetime (ISO 8601 format, UTC timezone), name (String), email (string)

Here are some instructions - 

Chat with user who wants to schedule an appointment with your owner.
Ask if they have any choice for the appointment time.
You must be able to understand that users might be from a different time zone.
Always use their timezone while chatting about times and dates to the user.
Before scheduling the appointment, you must ask their name and email.
Your owner is in IST timezone (+05:30)
Time and date now for your owner is ${getCurrentTimeInTimeZone("Asia/Kolkata")}
`;

/**
 * Push the SYSTEM PROMPT to our messages array
 */
messages.push({
    role: 'system',
    content: SYSTEM_PROMPT
});

/**
 * AVAILABLE FUNCTIONS
 * @param datetime 
 * @returns 
 */

function check_appointment_availability(datetime: string){
    console.log("Calling check_appointment_availability ", datetime)
    return true;
}

function schedule_appointment(datetime: string, name: string, email: string){
    console.log("Calling schedule_appointment ", datetime, name, email)
    return true;
}

function delete_appointment(datetime: string, name: string, email: string){
    console.log("Calling delete_appointment ", datetime, name, email)
    return true;
}

const function_map = {
    'check_appointment_availability': check_appointment_availability,
    'schedule_appointment': schedule_appointment,
    'delete_appointment': delete_appointment
} as any

/**
 * Function to send the response to LLM and get the response
 * @param content 
 * @returns 
 */
async function send_to_llm(content: string){

    messages.push({
        role: 'user',
        content
    });

    const response = await client.chat.completions.create({
        messages,
        model: 'gpt-4o'
    });

    messages.push(response.choices[0].message);

    return response.choices[0].message.content;
}

/**
 * Process the llm response, send it to user or do function call
 * @param response 
 */
async function process_llm_response(response: any){
    const parsedJson = JSON.parse(response);

    if(parsedJson.to == 'user'){
        console.log(parsedJson.message);
    }else if(parsedJson.to == 'system'){
        const fn = parsedJson.function_call.function;
        const args = parsedJson.function_call.arguments;

        const functionResponse = function_map[fn](...args);

        await process_llm_response(await send_to_llm('response is '+functionResponse ? 'true' : 'false'))
    }
}

/**
 * main function
 */
async function main(){

    while(true){

        const input: string = await new Promise((resolve)=>{
            rl.question("Say something: ", resolve);
        });

        const response = await send_to_llm(input);
        await process_llm_response(response);
    
    }

}

main();