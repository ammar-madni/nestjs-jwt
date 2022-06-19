import { ForbiddenException, Injectable } from '@nestjs/common';
import { AuthDto } from './dto';
import * as argon from 'argon2';
import { Tokens } from './types';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CreateUserDto } from 'src/users/dto';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  async register(newUser: CreateUserDto): Promise<Tokens> {
    const user = await this.usersService.create(newUser);
    return await this.#getTokens(user.id, user.name, user.email);
  }

  async login(userCredentials: AuthDto): Promise<Tokens> {
    const user = await this.usersService.find({
      email: userCredentials.email,
    });
    if (!user) throw new ForbiddenException('Invalid credentials');

    const passwordMatches = await argon.verify(
      user.password,
      userCredentials.password,
    );
    if (!passwordMatches) throw new ForbiddenException('Invalid credentials');

    return await this.#getTokens(user.id, user.name, user.email);
  }

  async logout(userId: number) {
    await this.usersService.updateRefreshToken(userId, null);
  }

  async refreshTokens(userId: number, refreshToken: string): Promise<Tokens> {
    const user = await this.usersService.find({ id: userId });
    if (!user || !user.refreshToken)
      throw new ForbiddenException('Invalid credentials');

    const refreshTokenMatches = await argon.verify(
      user.refreshToken,
      refreshToken,
    );
    if (!refreshTokenMatches)
      throw new ForbiddenException('Invalid credentials');

    return await this.#getTokens(user.id, user.name, user.email);
  }

  async #getTokens(
    userId: number,
    name: string,
    email: string,
  ): Promise<Tokens> {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        {
          sub: userId,
          name,
          email,
        },
        {
          secret: this.config.get('JWT_ACCESS_TOKEN_SECRET'),
          expiresIn: this.config.get('JWT_ACCESS_TOKEN_EXPIRATION'),
        },
      ),
      this.jwtService.signAsync(
        {
          sub: userId,
          name,
          email,
        },
        {
          secret: this.config.get('JWT_REFRESH_TOKEN_SECRET'),
          expiresIn: this.config.get('JWT_REFRESH_TOKEN_EXPIRATION'),
        },
      ),
    ]);

    await this.usersService.updateRefreshToken(userId, refreshToken);

    return {
      accessToken,
      refreshToken,
    };
  }
}
