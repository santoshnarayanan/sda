import { useEffect, useState} from "react";
import {getAgentStatus } from "../api/agentAsync";

/*
    * The useAgentPolling hook is a custom React hook that polls the status of an agent task using its task ID.
        * It takes a taskId as an argument and returns the current status and result of the agent task.
        * The hook uses useEffect to set up a polling interval that calls the getAgentStatus function every 2 seconds until the task is completed.
*/

export function useAgentPolling(taskId: string) {
    const [status, setStatus] = useState<string>("idle");
    const [result, setResult] = useState<any>(null);

    useEffect(() => {
        if (!taskId) return;
    
        const interval = setInterval(async () => {
            const data = await getAgentStatus(taskId);

            setStatus(data.status);
            if(data.status === "completed") {
                setResult(data.result);
                clearInterval(interval);
            }
        }, 2000); // Poll every 2 seconds
    
        return () => clearInterval(interval);
    }, [taskId]);

    return { status, result };
}