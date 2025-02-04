import { useEffect, useRef, useState } from "react";
import LocalStorageManager from "../services/localStorageManager";

export default function usePersistor<T>(key: string, initialData: T, driver: LocalStorageManager) {
    const [storedData, setStoredData] = useState<T>(initialData);
    const _channel = useRef(new BroadcastChannel(key)).current;

    const _readValue = () => {
        const value = driver.get(key);
        return value ?? initialData;
    };

    const setValue = (data: T) => {
        driver.set(key, data);

        setStoredData(data);
        _channel.postMessage(data);
    };

    useEffect(() => {
        const value = _readValue();
        setStoredData(value);
    }, []);

    useEffect(() => {
        function _listener({ data }: MessageEvent) {
            setStoredData(data);
        }

        _channel.addEventListener("message", _listener);
        return () => {
            _channel.removeEventListener("message", _listener);
        };
    }, []);

    return [storedData, setValue] as const;
}
