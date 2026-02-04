import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  async validateUser(username: string, password: string): Promise<any> {
    // Mock validation - replace with real authentication
    if (username === 'dispatcher' && password === 'password') {
      return { id: 1, username: 'dispatcher', role: 'dispatcher' };
    }
    if (username === 'driver' && password === 'password') {
      return { id: 2, username: 'driver', role: 'driver' };
    }
    return null;
  }

  async login(user: any) {
    const payload = { username: user.username, sub: user.id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: user,
    };
  }
}