export interface Cat { name: string; h: number; s: number }
export interface Post {
  id: string; title: string; date: string; y: number; m: number; d: number; cat: number;
  excerpt: string; minutes: number; photo: string | null; url: string; likes: number; views: number;
}
export interface BlogData { cats: Cat[]; posts: Post[]; inCat: (i: number) => Post[] }
