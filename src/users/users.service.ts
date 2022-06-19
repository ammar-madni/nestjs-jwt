import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime';
import * as argon from 'argon2';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserDto, UpdateUserDto } from './dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(newUser: CreateUserDto) {
    try {
      return await this.prisma.user.create({
        data: {
          ...newUser,
          password: await argon.hash(newUser.password),
        },
      });
    } catch (e) {
      if (e instanceof PrismaClientKnownRequestError) {
        if (e.code === 'P2002') {
          throw new ForbiddenException('Email already in use');
        }
      }
      throw e;
    }
  }

  async findAll(filter: any) {
    return await this.prisma.user.findMany({ where: filter });
  }

  async find(uniqueIdentifier: any) {
    return await this.prisma.user.findUnique({ where: uniqueIdentifier });
  }

  async update(id: number, user: UpdateUserDto) {
    return await this.prisma.user.update({
      where: { id },
      data: {
        ...user,
      },
    });
  }

  async updateRefreshToken(id: number, refreshToken: string | null) {
    await this.prisma.user.update({
      where: { id },
      data: {
        refreshToken:
          refreshToken === null ? refreshToken : await argon.hash(refreshToken),
      },
    });
  }

  async delete(id: number) {
    return await this.prisma.user.delete({ where: { id } });
  }
}
