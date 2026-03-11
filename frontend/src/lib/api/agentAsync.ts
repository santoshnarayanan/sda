

import axios from "axios";

const API_BASE  = "http://localhost:8000/api/v1";

/*
    * Run an agent asynchronously and get the task ID for status tracking.
        * @param payload - The data required to run the agent.
        * @return The response from the server, including the task ID.
        * Example usage:
        * const payload = {
        *   agentName: "exampleAgent",
        *   parameters: {       

*/
export const runAgent = async(payload: any) => {
    const response = await axios.post(`${API_BASE}/agent_run_sync`, payload);
    return response.data;
}

/*
    * Get the status of an agent task using its task ID.
        * @param taskId - The ID of the task to check.
        * @return The response from the server, including the current status of the task.
        * Example usage:
        * const taskId = "12345";
        * const status = await getAgentStatus(taskId);

*/


/*
    * Note: The actual structure of the payload and the response may vary based on your backend implementation.
*/
export const getAgentStatus = async(taskId: string) => {
    const response = await axios.get(`${API_BASE}/agent_status/${taskId}`);
    return response.data; 
}   

