import { users, type User, type InsertUser, type GeneratedImage } from "@shared/schema";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  saveImage(image: GeneratedImage): Promise<GeneratedImage>;
  getAllImages(): Promise<GeneratedImage[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private images: Map<string, GeneratedImage>;
  currentId: number;

  constructor() {
    this.users = new Map();
    this.images = new Map();
    this.currentId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async saveImage(image: GeneratedImage): Promise<GeneratedImage> {
    this.images.set(image.id, image);
    return image;
  }

  async getAllImages(): Promise<GeneratedImage[]> {
    return Array.from(this.images.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
}

export const storage = new MemStorage();
