import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthDto } from './dto';
import * as argon from 'argon2';
import { Tokens } from './types';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CreateUserDto } from 'src/users/dto';
import { UsersService } from 'src/users/users.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { User } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async register(newUser: CreateUserDto): Promise<Tokens> {
    const user = await this.usersService.create(newUser);
    return await this.#generateTokens(user.id, user.name, user.email);
  }

  async login(userCredentials: AuthDto): Promise<Tokens> {
    const user = await this.validateUser(
      userCredentials.email,
      userCredentials.password,
    );

    const tokens = await this.#generateTokens(user.id, user.name, user.email);

    return tokens;
  }

  async logout(userId: number, refreshToken: string) {
    await this.prisma.refreshToken
      .delete({
        where: { token: refreshToken },
      })
      .catch(async (error) => {
        if (error instanceof PrismaClientKnownRequestError) {
          if (error.code === 'P2025') {
            await this.#handleReuseDetected(userId);
          }
        }
      });
  }

  async logoutAll(userId: number) {
    await this.prisma.refreshToken.deleteMany({
      where: {
        userId,
      },
    });
  }

  async refreshTokens(userId: number, refreshToken: string): Promise<Tokens> {
    const oldRefreshToken = await this.prisma.refreshToken.findFirst({
      where: {
        userId,
        token: refreshToken,
      },
      include: {
        user: true,
      },
    });
    if (!oldRefreshToken) {
      await this.#handleReuseDetected(userId);
    }

    const tokens = await this.#generateTokens(
      oldRefreshToken.userId,
      oldRefreshToken.user.name,
      oldRefreshToken.user.email,
      oldRefreshToken.token,
    );

    return tokens;
  }

  async validateUser(email: string, password: string): Promise<User> {
    const user = await this.usersService.find({
      email,
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const passwordMatches = await argon.verify(user.password, password);
    if (!passwordMatches)
      throw new UnauthorizedException('Invalid credentials');

    return user;
  }

  async #generateTokens(
    userId: number,
    name: string,
    email: string,
    oldRefreshToken?: string,
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

    if (oldRefreshToken) {
      await this.prisma.refreshToken.update({
        where: {
          token: oldRefreshToken,
        },
        data: {
          token: refreshToken,
        },
      });
    } else {
      await this.prisma.refreshToken.create({
        data: { userId, token: refreshToken },
      });
    }

    return {
      accessToken,
      refreshToken,
    };
  }

  async #handleReuseDetected(userId: number) {
    await this.logoutAll(userId);
    throw new UnauthorizedException('Invalid Credentials');
  }
}
