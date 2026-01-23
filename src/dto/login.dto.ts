import { z } from 'zod';

const loginDTO = z.object({
  identifier: z.string().min(1, 'Email is required'),
  password: z.string().min(6, 'Password is required'),
});

export default loginDTO;
