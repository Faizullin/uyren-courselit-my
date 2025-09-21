export abstract class BaseResourceService {
    abstract name: string;
    abstract initialize(): Promise<void>;
}