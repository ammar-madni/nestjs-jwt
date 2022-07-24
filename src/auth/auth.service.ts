import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthDto } from './dto';
import * as argon from 'argon2';
import { Tokens } from './types';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CreateUserDto } from 'src/users/dto';
import { UsersService } from 'src/users/users.service';
import { PrismaService } from 'src/prisma/prisma.service';

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
    const user = await this.usersService.find({
      email: userCredentials.email,
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const passwordMatches = await argon.verify(
      user.password,
      userCredentials.password,
    );
    if (!passwordMatches)
      throw new UnauthorizedException('Invalid credentials');

    const tokens = await this.#generateTokens(user.id, user.name, user.email);

    await this.prisma.refreshToken.create({
      data: { userId: user.id, token: tokens.refreshToken },
    });

    return tokens;
  }

  async logout(refreshToken: string) {
    await this.prisma.refreshToken.delete({
      where: { token: refreshToken },
    });
  }

  async refreshTokens(userId: number, refreshToken: string): Promise<Tokens> {
    const oldRefreshToken = await this.prisma.refreshToken.findFirst({
      where: {
        userId,
        token: await argon.hash(refreshToken),
      },
      include: {
        user: true,
      },
    });
    if (!oldRefreshToken) {
      await this.prisma.refreshToken.deleteMany({ where: { userId } });
      throw new UnauthorizedException('Invalid Credentials');
    }

    const tokens = await this.#generateTokens(
      oldRefreshToken.userId,
      oldRefreshToken.user.name,
      oldRefreshToken.user.email,
    );

    await this.prisma.refreshToken.update({
      where: oldRefreshToken,
      data: {
        token: await argon.hash(tokens.refreshToken),
      },
    });

    return tokens;
  }

  async #generateTokens(
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

    return {
      accessToken,
      refreshToken,
    };
  }
}
