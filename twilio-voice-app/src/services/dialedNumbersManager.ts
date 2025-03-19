export default class DialedNumbersManager {
    private storage: Map<string, Set<string>> = new Map();

    // Create a unique key combining candidateId and number
    private createKey(candidateId: string, number: string): string {
        return `${candidateId}:${number}`;
    }

    add(candidateId: string, number: string): void {
        const key = this.createKey(candidateId, number);
        if (!this.storage.has(candidateId)) {
            this.storage.set(candidateId, new Set());
        }
        this.storage.get(candidateId)?.add(number);
    }

    has(candidateId: string, number: string): boolean {
        const numbers = this.storage.get(candidateId);
        return numbers?.has(number) ?? false;
    }

    clear(): void {
        this.storage.clear();
    }
}