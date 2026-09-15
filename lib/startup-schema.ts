import {z} from 'zod';
export const submissionSchema=z.object({
  name:z.string().trim().min(2).max(80),
  website:z.string().trim().url().max(500).refine(v=>/^https?:\/\//i.test(v),'Use an http or https website URL.'),
  pitch:z.string().trim().min(10).max(120),
  story:z.string().trim().min(50).max(3000),
  category:z.enum(['Fintech','AI','SaaS','Climate / Energy','Health','Education','Commerce','Mobility','AgriTech','Developer Tools','Other']),
  city:z.string().trim().min(2).max(80),
  stage:z.enum(['Idea','Building','Launched','Revenue','Growing']),
  year:z.coerce.number().int().min(1900).max(new Date().getFullYear()),
  founder:z.string().trim().min(2).max(120),
});
export type StartupRecord={id:string;slug:string;name:string;website:string;pitch:string;story:string;category:string;city:string;stage:string;founded_year:number;founder:string;published_at:string;today_votes:number;week_votes:number;month_votes:number;total_votes:number;my_vote:boolean;logo_path?:string|null};
export type SubmissionRecord={id:string;name:string;website:string;pitch:string;story:string;category:string;city:string;stage:string;founded_year:number;founder:string;status:'pending'|'approved'|'rejected';review_note:string|null;created_at:string;logo_path?:string|null};
