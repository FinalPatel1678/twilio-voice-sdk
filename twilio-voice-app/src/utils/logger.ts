type LogLevel = 'info' | 'error' | 'warn' | 'debug' | 'state';

interface Logger {
    info: (message: string, data?: any) => void;
    error: (message: string, error?: any) => void;
    warn: (message: string, data?: any) => void;
    debug: (message: string, data?: any) => void;
    state: (component: string, data: any) => void;
}

const logger: Logger = {
    info: (message: string, data?: any) => {
        console.log(`[INFO] ${message}`, data ? JSON.stringify(data, null, 2) : '');
    },
    
    error: (message: string, error?: any) => {
        console.error(`[ERROR] ${message}`, error ? {
            message: error.message,
            stack: error.stack,
            details: error
        } : '');
    },
    
    warn: (message: string, data?: any) => {
        console.warn(`[WARN] ${message}`, data ? JSON.stringify(data, null, 2) : '');
    },
    
    debug: (message: string, data?: any) => {
        if (process.env.NODE_ENV === 'development') {
            console.debug(`[DEBUG] ${message}`, data ? JSON.stringify(data, null, 2) : '');
        }
    },
    
    state: (component: string, data: any) => {
        console.log(`[STATE][${component}]`, JSON.stringify(data, null, 2));
    }
};

export default logger;
